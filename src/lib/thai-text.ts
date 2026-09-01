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
 * Re-segments Whisper's BPE subword tokens into linguistically correct Thai words
 * using the browser's built-in Intl.Segmenter('th', { granularity: 'word' }).
 *
 * This is the definitive solution for Thai tokenization — it handles ALL cases where
 * Whisper splits mid-syllable (e.g. "คื"+"อ" → "คือ", "สา"+"มารถ" → "สามารถ",
 * "ต้"+"อง" → "ต้อง") by rebuilding from the full concatenated text.
 */
export function resegmentThaiWords<T extends { word: string; start: number; end: number }>(tokens: T[]): T[] {
  if (!tokens || tokens.length === 0) return [];

  const segmenter = getThaiSegmenter();
  if (!segmenter) {
    return mergeThaiSubwordsFallback(tokens);
  }

  const result: T[] = [];

  for (const token of tokens) {
    const text = token.word.trim();
    if (!text) continue;

    // Segment each token independently to prevent cross-token corruption
    const segs = Array.from(segmenter.segment(text)).filter((s) => s.segment.trim());
    if (segs.length <= 1) {
      result.push({
        ...token,
        word: text,
      });
    } else {
      // Divide duration proportionally by character length
      const dur = Math.max(0.1, token.end - token.start);
      const totalLen = Math.max(1, text.length);
      let curStart = token.start;

      for (const seg of segs) {
        const segDur = dur * (seg.segment.length / totalLen);
        const wStart = parseFloat(curStart.toFixed(2));
        const wEnd = parseFloat((curStart + segDur).toFixed(2));

        result.push({
          ...token,
          word: seg.segment,
          start: wStart,
          end: Math.max(wStart + 0.05, wEnd),
        });
        curStart += segDur;
      }
    }
  }

  return result;
}

/**
 * Fallback merge for environments without Intl.Segmenter.
 * Only handles combining characters (tone marks, vowel marks) — not mid-syllable splits.
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
 */
export function cleanThaiText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove zero-width spaces and weird non-printable unicode
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. Normalize non-breaking spaces to standard space
  text = text.replace(/\u00A0/g, ' ');

  // 3. Remove known hallucinated subtitle tags like [Music] or (Applause)
  HALLUCINATION_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  // 4. Normalize repetitive Thai tone marks / duplicate vowels
  // e.g. ้้ -> ้, ่่ -> ่
  text = text.replace(/([่้๊๋์])\1+/g, '$1');
  text = text.replace(/([ะัาิีึืุู])\1+/g, '$1');

  // 5. Fix Thai SARA AM if separated (ํ + า -> ำ)
  text = text.replace(/\u0E4D\u0E32/g, '\u0E33');

  // 6. Clean up repetitive word loops (Whisper loop bug: "สวัสดีครับ สวัสดีครับ สวัสดีครับ")
  // Use explicit whitespace boundaries instead of ASCII-only \b for Thai support
  text = text.replace(/(?:^|\s)(\S+(?:\s+\S+){0,3})\s+\1\s+\1+(?=\s|$)/gi, ' $1');

  // 7. Normalize multi-spaces into single space
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
    tokens = segments.map((s) => s.segment);
  } else {
    // Fallback: split by space, though this is poor for Thai
    tokens = text.split(/\s+/).filter(Boolean);
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
