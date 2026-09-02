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
  const regex = /([\u0E00-\u0E7F]+|[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\b|[^\w])|[0-9]+|[^\s\u0E00-\u0E7FA-Za-z0-9]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim()) {
      parts.push(match[0].trim());
    }
  }
  return parts.length > 0 ? parts : [text];
}

/**
 * Expands an array of timed words so that any compound tokens are broken into fine-grained,
 * single-word units with proportionally distributed start and end timestamps.
 */
export function expandWordsToFineGrained<T extends { word: string; start: number; end: number }>(words?: T[] | null): T[] {
  if (!words || words.length === 0) return [];
  const result: T[] = [];

  for (const w of words) {
    const rawWord = w.word.trim();
    if (!rawWord) continue;

    const subwords = splitCompoundSegment(rawWord);
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
      const subEnd = isLast ? w.end : currStart + subDur;

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
 * Re-segments Whisper's BPE subword tokens into linguistically correct Thai & English words
 * using the browser's built-in Intl.Segmenter('th', { granularity: 'word' }).
 *
 * Concatenates continuous token clusters and re-segments the unified text so that
 * mid-word splits like "เป็"+"น" -> "เป็น", "นะ"+"ครั"+"บ" -> "นะครับ", "Type"+"-C" -> "Type-C"
 * are 100% fused into proper, grammatically intact words.
 */
export function resegmentThaiWords<T extends { word: string; start: number; end: number }>(tokens: T[]): T[] {
  if (!tokens || tokens.length === 0) return [];

  const segmenter = getThaiSegmenter();
  if (!segmenter) {
    return mergeThaiSubwordsFallback(tokens);
  }

  // 1. Group tokens into speech phrases (split on significant pauses >= 0.45s)
  const phrases: T[][] = [];
  let currentPhrase: T[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = currentPhrase[currentPhrase.length - 1];
    const isBigGap = prev ? (tok.start - prev.end) >= 0.45 : false;

    if (isBigGap && currentPhrase.length > 0) {
      phrases.push(currentPhrase);
      currentPhrase = [tok];
    } else {
      currentPhrase.push(tok);
    }
  }
  if (currentPhrase.length > 0) {
    phrases.push(currentPhrase);
  }

  const result: T[] = [];

  // 2. Process each phrase with global character-to-time projection
  for (const phrase of phrases) {
    let concatenatedText = '';
    const charTimes: Array<{ start: number; end: number }> = [];

    for (const tok of phrase) {
      const cleaned = cleanThaiText(tok.word);
      if (!cleaned) continue;

      const dur = Math.max(0.05, tok.end - tok.start);
      const len = cleaned.length;

      for (let c = 0; c < len; c++) {
        const cStart = tok.start + (c / len) * dur;
        const cEnd = tok.start + ((c + 1) / len) * dur;
        charTimes.push({
          start: parseFloat(cStart.toFixed(3)),
          end: parseFloat(cEnd.toFixed(3)),
        });
      }
      concatenatedText += cleaned;
    }

    if (!concatenatedText || charTimes.length === 0) continue;

    // Run Intl.Segmenter on the whole continuous phrase
    const segs = Array.from(segmenter.segment(concatenatedText));

    // Post-process segments: combine hyphens with surrounding words (e.g. Type + - + C -> Type-C)
    const fusedSegments: Array<{ segment: string; index: number }> = [];

    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s];
      const txt = seg.segment.trim();
      if (!txt) continue;

      const prev = fusedSegments[fusedSegments.length - 1];

      const isHyphen = txt === '-' || txt === '–' || txt === '—';
      const isPrevHyphen = prev && (prev.segment.endsWith('-') || prev.segment.endsWith('–') || prev.segment.endsWith('—'));

      // If current token is hyphen, glue to prev (e.g. "Type" + "-" -> "Type-")
      if (prev && isHyphen) {
        prev.segment += txt;
        continue;
      }

      // If prev token ended with hyphen, glue current to prev (e.g. "Type-" + "C" -> "Type-C")
      if (prev && isPrevHyphen) {
        prev.segment += txt;
        continue;
      }

      // If current token is a combining Thai mark with no consonant (safety fallback), glue to prev
      if (prev && THAI_NON_INITIAL.test(txt)) {
        prev.segment += txt;
        continue;
      }

      // If previous ended with incomplete Thai vowel (เ, แ, โ, ใ, ไ), glue to prev
      if (prev && THAI_TRAILING_INCOMPLETE.test(prev.segment)) {
        prev.segment += txt;
        continue;
      }

      fusedSegments.push({
        segment: txt,
        index: seg.index,
      });
    }

    // Build the final timed words for this phrase
    for (const item of fusedSegments) {
      const wordText = item.segment;
      const startCharIdx = item.index;
      const endCharIdx = Math.min(startCharIdx + wordText.length - 1, charTimes.length - 1);

      const wStart = charTimes[startCharIdx]?.start ?? phrase[0].start;
      const wEnd = charTimes[endCharIdx]?.end ?? phrase[phrase.length - 1].end;

      result.push({
        ...phrase[0],
        word: wordText,
        start: parseFloat(wStart.toFixed(2)),
        end: parseFloat(Math.max(wStart + 0.05, wEnd).toFixed(2)),
      });
    }
  }

  return expandWordsToFineGrained(result);
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
    const w = rawWord.trim();
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
 * Used to regenerate word tokens when a user manually edits a caption block.
 */
export function distributeTextToWords(text: string, start: number, end: number): { word: string; start: number; end: number }[] {
  if (!text.trim()) return [];

  const segmenter = getThaiSegmenter();
  let tokens: string[] = [];

  if (segmenter) {
    const segments = Array.from(segmenter.segment(text));
    tokens = segments.flatMap((s) => splitCompoundSegment(s.segment.trim())).filter(Boolean);
  } else {
    // Fallback: split by space
    tokens = text.split(/\s+/).flatMap((s) => splitCompoundSegment(s.trim())).filter(Boolean);
  }

  const duration = end - start;
  const totalLength = text.length || 1;

  let currentStart = start;

  return tokens.map((token) => {
    // Proportional duration based on string length
    const tokenDuration = (token.length / totalLength) * duration;
    const tokenEnd = currentStart + tokenDuration;

    const result = {
      word: token,
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

