/**
 * Thai Text Processing and Normalization Utilities
 * Handles character cleanup, space normalization, tone mark fixing,
 * and Whisper hallucination filtering.
 */

// Common Whisper repetition / hallucination patterns in Thai & English subtitles
const HALLUCINATION_PATTERNS = [
  /\[.*?\]/g,                    // [เสียงดนตรี], [Music], etc.
  /\(.*?\)/g,                    // (เสียงปรบมือ), etc.
  /^(ขอบคุณสำหรับการรับชม|ขอบคุณที่รับชม|ขอบคุณครับ|ขอบคุณค่ะ)+$/g,
  /^(Subtitles? by|Transcribed by|Amara\.org).*/gi,
];

// Regex for Thai characters that can never begin a standalone word or syllable token
// Used as fallback safety check in caption grouping
export const THAI_NON_INITIAL = /^[\s]*[\u0E2F\u0E30-\u0E3A\u0E45\u0E46\u0E47-\u0E4E]/;

// Regex for Thai leading vowels (เ, แ, โ, ใ, ไ) that cannot end a token alone
export const THAI_TRAILING_INCOMPLETE = /[\u0E40-\u0E44]$/;

/**
 * Common Thai clause-initiating conjunctions and discourse markers.
 * Used by caption grouping to break subtitles at natural syntactic boundaries.
 */
export const THAI_CLAUSE_CONJUNCTIONS = new Set([
  // เหตุผล / Cause & Reason
  'เพราะว่า', 'เพราะ', 'เนื่องจาก', 'เนื่องด้วย', 'สืบเนื่องจาก',
  // ขัดแย้ง / Contrast & Concession
  'แต่ว่า', 'แต่', 'แต่ทว่า', 'ทว่า', 'อย่างไรก็ตาม', 'ถึงแม้ว่า', 'แม้ว่า', 'ทั้งนี้',
  // ผลลัพธ์ / Result & Consequence
  'ดังนั้น', 'ฉะนั้น', 'เพราะฉะนั้น', 'ส่งผลให้', 'ทำให้',
  // เงื่อนไข / Condition
  'ถ้าหากว่า', 'ถ้าหาก', 'หากว่า', 'ในกรณีที่',
  // เสริมความ / Transition & Addition
  'นอกจากนี้', 'ยิ่งไปกว่านั้น', 'อีกทั้ง', 'ในขณะที่', 'รวมถึง',
  // ตัวอย่าง / Exemplification
  'เช่น', 'ตัวอย่างเช่น', 'อาทิเช่น',
  // English common conjunctions in mixed speech
  'because', 'however', 'therefore', 'although',
]);

/**
 * Checks if a word or 2-word sequence acts as a clause-initiating boundary.
 */
export function isClauseBoundaryWord(currentWord: string, nextWord?: string): boolean {
  if (!currentWord) return false;
  const w = currentWord.trim();
  const lower = w.toLowerCase();

  // Guard against temporal/idiomatic phrases like "แต่เช้า", "แต่แรก", "แต่เด็ก", "แต่ก่อน"
  if (w === 'แต่' && nextWord) {
    const nw = nextWord.trim();
    if (nw === 'เช้า' || nw === 'แรก' || nw === 'เด็ก' || nw === 'ก่อน') {
      return false;
    }
  }

  // Exact match
  if (THAI_CLAUSE_CONJUNCTIONS.has(w) || THAI_CLAUSE_CONJUNCTIONS.has(lower)) {
    return true;
  }

  // 2-token compound match (e.g. "เพราะ" + "ว่า" -> "เพราะว่า")
  if (nextWord) {
    const combined = (w + nextWord.trim()).toLowerCase();
    if (THAI_CLAUSE_CONJUNCTIONS.has(combined)) {
      return true;
    }
  }

  return false;
}

let thaiSegmenter: Intl.Segmenter | null = null;

function getThaiSegmenter() {
  if (!thaiSegmenter && typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    thaiSegmenter = new Intl.Segmenter('th', { granularity: 'word' });
  }
  return thaiSegmenter;
}

/**
 * Splits compound words where Thai and Latin/Digits or CamelCase words are fused together
 * (e.g. "จากTableDescription" -> ["จาก", "Table", "Description"])
 * (e.g. "GuideScript" -> ["Guide", "Script"])
 * (e.g. "ราคา399บาท" -> ["ราคา", "399", "บาท"])
 */
export function splitCompoundSegment(text: string): string[] {
  if (!text) return [];
  const parts: string[] = [];
  const regex = /([\u0E00-\u0E7F]+|[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\b|[^\w])|[0-9]+(?:\.[0-9]+)?|[^\s\u0E00-\u0E7FA-Za-z0-9]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim()) {
      parts.push(match[0].trim());
    }
  }
  if (parts.length === 0) return [text];

  // Post-process: preserve hyphenated words like Type-C, Wi-Fi, e-Tax
  const fused: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const prev = fused.length > 0 ? fused[fused.length - 1] : null;
    const isHyphen = p === '-' || p === '–' || p === '—';
    const isPrevHyphen = prev && (prev.endsWith('-') || prev.endsWith('–') || prev.endsWith('—'));

    if (prev && isHyphen) {
      fused[fused.length - 1] += p;
      continue;
    }
    if (prev && isPrevHyphen) {
      fused[fused.length - 1] += p;
      continue;
    }
    fused.push(p);
  }

  return fused;
}

/**
 * Expands an array of timed words so that any compound tokens or multi-word segments
 * are broken into fine-grained, single-word units with proportionally distributed start and end timestamps.
 * Crucially, each token's expansion is confined STRICTLY within its own start and end boundaries,
 * guaranteeing zero cumulative drift across adjacent words.
 */
export function expandWordsToFineGrained<T extends { word: string; start: number; end: number }>(words?: T[] | null): T[] {
  if (!words || words.length === 0) return [];
  const segmenter = getThaiSegmenter();
  const result: T[] = [];

  for (const w of words) {
    const rawWord = w.word.trim();
    if (!rawWord) continue;

    // 1. Check for mixed compound tokens (e.g. "ราคา399บาท" -> ["ราคา", "399", "บาท"])
    const compoundParts = splitCompoundSegment(rawWord);
    let subwords: string[] = [];

    if (compoundParts.length > 1) {
      subwords = compoundParts;
    } else if (segmenter && /[\u0E00-\u0E7F]/.test(rawWord) && rawWord.length >= 6) {
      // 2. If a single token contains multiple Thai words (e.g. Gemini multi-word phrase "สวัสดีครับ" -> ["สวัสดี", "ครับ"])
      const segs = Array.from(segmenter.segment(rawWord))
        .map((s) => s.segment.trim())
        .filter(Boolean);
      const fusedSegs: string[] = [];
      for (const s of segs) {
        const prev = fusedSegs[fusedSegs.length - 1];
        const isHyphen = s === '-' || s === '–' || s === '—';
        const isPrevHyphen = prev && (prev.endsWith('-') || prev.endsWith('–') || prev.endsWith('—'));
        if (prev && (isHyphen || isPrevHyphen)) {
          fusedSegs[fusedSegs.length - 1] += s;
        } else {
          fusedSegs.push(s);
        }
      }
      if (fusedSegs.length > 1) {
        subwords = fusedSegs;
      } else {
        subwords = [rawWord];
      }
    } else {
      subwords = [rawWord];
    }

    if (subwords.length <= 1) {
      result.push(w);
      continue;
    }

    const dur = Math.max(0.05, w.end - w.start);
    const totalChars = subwords.reduce((acc, s) => acc + s.length, 0);
    let currStart = w.start;

    for (let i = 0; i < subwords.length; i++) {
      const sub = subwords[i];
      const isLast = i === subwords.length - 1;
      const subDur = (sub.length / totalChars) * dur;
      const subEnd = isLast ? Math.max(w.end, currStart + 0.04) : currStart + subDur;

      result.push({
        ...w,
        word: sub,
        start: parseFloat(currStart.toFixed(3)),
        end: parseFloat(Math.max(currStart + 0.04, subEnd).toFixed(3)),
      });

      currStart = subEnd;
    }
  }

  return result;
}

/**
 * Re-segments STT tokens into linguistically correct Thai & English words
 * with STRICT acoustic timestamp preservation.
 *
 * 1. Merges detached BPE subwords, combining marks (tone marks, upper/lower vowels),
 *    and trailing incomplete vowels (เ, แ, โ, ใ, ไ) without disturbing unaffected words.
 * 2. Glues hyphenated words (e.g. Type + - + C -> Type-C) only when acoustically close.
 * 3. Expands compound words (e.g. "ราคา399.50บาท" or multi-word segments) STRICTLY
 *    within their individual token boundaries, preventing any cross-token timing drift.
 */
export function resegmentThaiWords<T extends { word: string; start: number; end: number; confidence?: number }>(
  tokens: T[]
): T[] {
  if (!tokens || tokens.length === 0) return [];

  const segmenter = getThaiSegmenter();
  if (!segmenter) {
    return mergeThaiSubwordsFallback(tokens);
  }

  // 1. First Pass: Merge broken BPE subword fragments, combining marks, trailing vowels, and hyphens
  const merged: T[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const rawTok = tokens[i];
    const cleaned = cleanThaiText(rawTok.word);
    if (!cleaned) continue;

    const tok: T = {
      ...rawTok,
      word: cleaned,
    };

    const prev = merged.length > 0 ? merged[merged.length - 1] : null;
    if (!prev) {
      merged.push(tok);
      continue;
    }

    const gap = tok.start - prev.end;
    const isClose = gap < 0.25;

    const isHyphen = cleaned === '-' || cleaned === '–' || cleaned === '—';
    const isPrevHyphen = prev.word.endsWith('-') || prev.word.endsWith('–') || prev.word.endsWith('—');
    const isNonInitial = THAI_NON_INITIAL.test(cleaned);
    const isPrevIncomplete = THAI_TRAILING_INCOMPLETE.test(prev.word.trimEnd());

    // Glue combining characters and incomplete vowels unconditionally,
    // but only glue hyphens if tokens are acoustically close (prevents cross-sentence dash merging)
    if (((isHyphen || isPrevHyphen) && isClose) || isNonInitial || isPrevIncomplete) {
      prev.word += cleaned;
      prev.end = Math.max(prev.end, tok.end);
      if (typeof tok.confidence === 'number' && typeof prev.confidence === 'number') {
        prev.confidence = Math.min(prev.confidence, tok.confidence);
      }
      continue;
    }

    // Whisper BPE Syllable Fusing: If two adjacent Thai tokens fuse into a single word according to Intl.Segmenter
    // (e.g. "คื" + "อ" -> "คือ", "สวัส" + "ดี" -> "สวัสดี")
    if (isClose) {
      const combined = prev.word + cleaned;
      const segs = Array.from(segmenter.segment(combined))
        .map((s) => s.segment.trim())
        .filter(Boolean);

      if (segs.length === 1) {
        prev.word = combined;
        prev.end = Math.max(prev.end, tok.end);
        if (typeof tok.confidence === 'number' && typeof prev.confidence === 'number') {
          prev.confidence = Math.min(prev.confidence, tok.confidence);
        }
        continue;
      }
    }

    merged.push(tok);
  }

  // 2. Second Pass: Fine-grained expansion of compound tokens within their own boundaries
  // (Preserves exact start and end boundaries of every token, preventing any cumulative timing drift)
  return expandWordsToFineGrained(merged);
}

/**
 * Fallback merge for combining characters (tone marks, upper/lower vowel marks)
 * and leading vowels that got detached into separate tokens.
 */
function mergeThaiSubwordsFallback<T extends { word: string; start: number; end: number }>(rawWords: T[]): T[] {
  if (!rawWords || rawWords.length === 0) return [];
  const merged: T[] = [];

  for (const w of rawWords) {
    if (!w.word || w.word.trim().length === 0) continue;
    const prev = merged.length > 0 ? merged[merged.length - 1] : null;
    const isNonInitial = Boolean(prev && THAI_NON_INITIAL.test(w.word));
    const isPrevIncomplete = Boolean(prev && THAI_TRAILING_INCOMPLETE.test(prev.word.trimEnd()));

    if (prev && (isNonInitial || isPrevIncomplete)) {
      prev.word = prev.word + w.word.trimStart();
      prev.end = Math.max(prev.end, w.end);
      continue;
    }
    merged.push({ ...w });
  }
  return merged;
}

/**
 * Cleans and normalizes Thai transcription text.
 * Fixes floating vowels, tone mark order, duplicate marks, and Whisper loops.
 */
export function cleanThaiText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove zero-width spaces, soft hyphens and weird non-printable unicode
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // 2. Normalize non-breaking spaces to standard space
  text = text.replace(/\u00A0/g, ' ');

  // 3. Remove spaces directly preceding Thai combining vowels or tone marks (Fix floating vowels)
  text = text.replace(/\s+([\u0E30-\u0E3A\u0E47-\u0E4E])/g, '$1');

  // 4. Remove known hallucinated subtitle tags like [Music] or (Applause)
  HALLUCINATION_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  // 5. Fix Thai Unicode combining order: Consonant + Upper Vowel + Tone Mark
  // If tone mark came before vowel (e.g. ก + ้ + ิ -> ก + ิ + ้), swap them
  text = text.replace(/([\u0E48-\u0E4B])([\u0E31\u0E34-\u0E3A])/g, '$2$1');

  // 6. Normalize repetitive Thai tone marks / duplicate vowels (e.g. ้้ -> ้, ่่ -> ่)
  text = text.replace(/([่้๊๋์])\1+/g, '$1');
  text = text.replace(/([ะัาิีึืุู])\1+/g, '$1');

  // 7. Fix Thai SARA AM if separated (NIKHAHIT ํ + SARA AA า -> SARA AM ำ)
  text = text.replace(/\u0E4D\u0E32/g, '\u0E33');

  // 8. Clean up repetitive word loops (Whisper loop bug: "สวัสดีครับ สวัสดีครับ สวัสดีครับ")
  text = text.replace(/(?:^|\s)(\S+(?:\s+\S+){0,3})\s+\1\s+\1+(?=\s|$)/gi, ' $1');

  // 9. Normalize multi-spaces into single space
  text = text.replace(/\s+/g, ' ');

  // 10. Strip non-numeric commas (Thai subtitles do not use commas, preserve numbers like 1,000)
  text = text.replace(/(?<!\d),(?!\d)/g, '');

  return text.trim();
}

/**
 * Helper to check if a word is only punctuation or symbols
 */
export function isPunctuationOnly(word: string): boolean {
  if (!word) return true;
  const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'…—–]/g, '').trim();
  return clean.length === 0;
}

export interface CaptionWordLike {
  word: string;
  start?: number;
  end?: number;
}

/**
 * Intelligently joins segmented words/tokens into natural display text:
 * - Thai + Thai within continuous speech (< pauseThresholdSec): joined without space (e.g. "เข้า" + "ไป" + "ดู" -> "เข้าไปดู")
 * - Pause detection (gap >= pauseThresholdSec, default 200ms): joined WITH space between clauses/sentences
 * - Latin + Latin: joined WITH space (e.g. "bluetooth" + "setting" -> "bluetooth setting", "setting," + "please" -> "setting, please")
 * - Latin + Thai / Thai + Latin: joined WITH space (e.g. "Samsung" + "ของ" -> "Samsung ของ", "Apple" + "(แอปเปิล)" -> "Apple (แอปเปิล)")
 * - Numbers + Thai / Thai + Numbers: joined WITH space (e.g. "ราคา" + "299" -> "ราคา 299", "299" + "บาท" -> "299 บาท")
 * - Maiyamok (ๆ) / Paiyannoi (ฯ): attached to previous Thai word, but followed by a space (e.g. "มากๆ และสามารถ")
 */
export function formatCaptionWordsText<T extends CaptionWordLike | string>(
  words: T[],
  options?: { pauseThresholdSec?: number }
): string {
  if (!words || words.length === 0) return '';

  const pauseThresholdSec = options?.pauseThresholdSec ?? 0.20;
  let result = '';
  let prevWordText = '';
  let prevItem: T | null = null;

  for (let i = 0; i < words.length; i++) {
    const currentItem = words[i];
    const rawWord = typeof currentItem === 'string' ? currentItem : currentItem.word;
    const w = rawWord.replace(/(?<!\d),(?!\d)/g, '').trim();
    if (!w) continue;

    if (result.length === 0) {
      result = w;
      prevWordText = w;
      prevItem = currentItem;
      continue;
    }

    // Strip leading/trailing punctuation to accurately detect script language
    const cleanPrev = prevWordText.replace(/^[^a-zA-Z0-9\u0E00-\u0E7F]+|[^a-zA-Z0-9\u0E00-\u0E7F]+$/g, '');
    const cleanCurr = w.replace(/^[^a-zA-Z0-9\u0E00-\u0E7F]+|[^a-zA-Z0-9\u0E00-\u0E7F]+$/g, '');

    const prevHasLatin = /[a-zA-Z]/.test(cleanPrev);
    const currHasLatin = /[a-zA-Z]/.test(cleanCurr);
    const prevHasNum = /[0-9]/.test(cleanPrev);
    const currHasNum = /[0-9]/.test(cleanCurr);
    const prevHasThai = /[\u0E00-\u0E7F]/.test(cleanPrev);
    const currHasThai = /[\u0E00-\u0E7F]/.test(cleanCurr);

    const prevIsMaiyamok = cleanPrev.endsWith('ๆ') || cleanPrev.endsWith('ฯ') || prevWordText.endsWith('ๆ') || prevWordText.endsWith('ฯ');
    const currIsMaiyamok = w.startsWith('ๆ') || w.startsWith('ฯ');

    // If current token is maiyamok or paiyannoi, attach directly to previous Thai word
    if (prevHasThai && currIsMaiyamok) {
      result += w;
      prevWordText = w;
      prevItem = currentItem;
      continue;
    }

    // Check pause gap between previous word and current word
    let isPauseGap = false;
    if (
      prevItem &&
      typeof prevItem === 'object' &&
      typeof currentItem === 'object' &&
      typeof (prevItem as CaptionWordLike).end === 'number' &&
      typeof (currentItem as CaptionWordLike).start === 'number'
    ) {
      const gap = (currentItem as CaptionWordLike).start! - (prevItem as CaptionWordLike).end!;
      if (gap >= pauseThresholdSec) {
        isPauseGap = true;
      }
    }

    // Check if previous word ended with trailing punctuation that naturally requires a space
    const prevEndsWithPunctuation = /[,;:!?]$/.test(prevWordText);

    // Script change or boundary conditions:
    const isScriptChange =
      (prevHasLatin && currHasLatin) ||
      (prevHasLatin && currHasThai) ||
      (prevHasThai && currHasLatin) ||
      (prevHasNum && currHasThai) ||
      (prevHasThai && currHasNum) ||
      (prevHasLatin && currHasNum) ||
      (prevHasNum && currHasLatin);

    // Rules for inserting a space:
    // 1. Language script switch or alphanumeric boundaries (e.g. "bluetooth setting", "Samsung ของ", "ราคา 299")
    // 2. Natural speech pauses between clauses / sentences (gap >= 200ms)
    // 3. After Maiyamok/Paiyannoi (e.g. "มากๆ" + "และ" -> "มากๆ และ", "ต้นๆ" + "ตอนแรก" -> "ต้นๆ ตอนแรก")
    // 4. After punctuation marks (e.g. ",", ":", ";", "!", "?")
    if (
      isScriptChange ||
      isPauseGap ||
      prevIsMaiyamok ||
      prevEndsWithPunctuation
    ) {
      result += ' ' + w;
    } else {
      // Thai + Thai continuous flow without pause -> join directly (e.g. "เข้า" + "ไป" + "ดู" -> "เข้าไปดู")
      result += w;
    }

    prevWordText = w;
    prevItem = currentItem;
  }

  return result.trim();
}

/**
 * Distributes a string of text into an array of words with proportional timestamps.
 * Preserves explicit user spaces and newlines between words accurately.
 */
export function distributeTextToWords(text: string, start: number, end: number): { word: string; start: number; end: number }[] {
  if (!text || !text.trim()) return [];

  const segmenter = getThaiSegmenter();
  const tokens: { word: string; hasLeadingSpace: boolean }[] = [];

  // Split by whitespace tokens while retaining space flags
  const parts = text.split(/( +|\n+)/);
  let isNextLeadingSpace = false;

  for (const part of parts) {
    if (/^ +$/.test(part) || /^\n+$/.test(part)) {
      isNextLeadingSpace = true;
      continue;
    }
    if (!part.trim()) continue;

    if (segmenter) {
      const segs = Array.from(segmenter.segment(part.trim()));
      const subTokens = segs.flatMap((s) => splitCompoundSegment(s.segment.trim())).filter(Boolean);
      subTokens.forEach((sub, subIdx) => {
        tokens.push({
          word: sub,
          hasLeadingSpace: subIdx === 0 && isNextLeadingSpace,
        });
      });
    } else {
      const subTokens = splitCompoundSegment(part.trim()).filter(Boolean);
      subTokens.forEach((sub, subIdx) => {
        tokens.push({
          word: sub,
          hasLeadingSpace: subIdx === 0 && isNextLeadingSpace,
        });
      });
    }
    isNextLeadingSpace = false;
  }

  const duration = Math.max(0.1, end - start);
  const totalChars = tokens.reduce((acc, t) => acc + t.word.length, 0) || 1;
  let currentStart = start;

  return tokens.map((t) => {
    const tokenDuration = (t.word.length / totalChars) * duration;
    const tokenEnd = currentStart + tokenDuration;

    const result = {
      word: t.hasLeadingSpace ? ` ${t.word}` : t.word,
      start: Number(currentStart.toFixed(3)),
      end: Number(tokenEnd.toFixed(3)),
    };

    currentStart = tokenEnd;
    return result;
  });
}

/**
 * Formats Thai numbers with commas if needed or cleans Thai digits
 */
export function thaiDigitsToArabic(text: string): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  let result = text;
  thaiDigits.forEach((digit, index) => {
    result = result.replaceAll(digit, index.toString());
  });
  return result;
}

let thaiGraphemeSegmenter: Intl.Segmenter | null = null;

/**
 * Returns grapheme clusters (combining marks + vowels glued to consonants)
 * to prevent floating Thai vowels when typing letter-by-letter.
 */
export function getGraphemeClusters(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    if (!thaiGraphemeSegmenter) {
      thaiGraphemeSegmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
    }
    return Array.from(thaiGraphemeSegmenter.segment(text)).map((s) => s.segment);
  }
  return Array.from(text);
}

export interface TypewriterSliceResult {
  visibleText: string;
  isComplete: boolean;
  isTyping: boolean;
  totalClusters: number;
  shownClusters: number;
}

/**
 * Calculates the exact visible substring of a word during letter-by-letter typewriter animation.
 * Typing speed is accelerated (finishes at ~68% of word duration) so the entire sentence completes
 * early before the audio ends, leaving ample hold time for the viewer to read the complete subtitle.
 */
export function getTypewriterSlice(
  word: string,
  start: number,
  end: number,
  currentTime: number,
  finishRatio = 0.68
): TypewriterSliceResult {
  if (!word) {
    return { visibleText: '', isComplete: false, isTyping: false, totalClusters: 0, shownClusters: 0 };
  }

  const clusters = getGraphemeClusters(word);
  const totalClusters = clusters.length;

  if (currentTime < start) {
    return { visibleText: '', isComplete: false, isTyping: false, totalClusters, shownClusters: 0 };
  }

  const rawDuration = Math.max(0.06, end - start);
  const typingDuration = Math.max(0.04, rawDuration * finishRatio);
  const elapsed = Math.max(0, currentTime - start);

  if (elapsed >= typingDuration || currentTime >= end) {
    return { visibleText: word, isComplete: true, isTyping: false, totalClusters, shownClusters: totalClusters };
  }

  // Active typing phase (accelerated speed ~1.45x)
  const progress = Math.min(1, elapsed / typingDuration);
  const shownClusters = Math.max(1, Math.min(totalClusters, Math.ceil(progress * totalClusters)));
  const visibleText = clusters.slice(0, shownClusters).join('');
  const isComplete = shownClusters >= totalClusters;

  return {
    visibleText,
    isComplete,
    isTyping: true,
    totalClusters,
    shownClusters,
  };
}

