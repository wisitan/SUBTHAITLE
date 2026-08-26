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
// (including Thai combining vowels \u0E31-\u0E3A, tone marks \u0E48-\u0E4B, karan \u0E4C, paiyannoi \u0E2F, maiyamok \u0E46, dependent vowels \u0E30, \u0E32, \u0E33, \u0E45, diacritics \u0E47, \u0E4D, \u0E4E)
export const THAI_NON_INITIAL = /^[\s]*[\u0E2F\u0E30-\u0E3A\u0E45\u0E46\u0E47-\u0E4E]/;

// Regex for Thai leading vowels (เ, แ, โ, ใ, ไ: \u0E40-\u0E44) that cannot end a token alone
export const THAI_TRAILING_INCOMPLETE = /[\u0E40-\u0E44]$/;

/**
 * Merges Whisper subword/character tokens into linguistically complete words.
 * Fixes Whisper splitting within syllables, floating tone marks, and separated vowels.
 */
export function mergeThaiSubwords<T extends { word: string; start: number; end: number }>(
  rawWords: T[]
): T[] {
  if (!rawWords || rawWords.length === 0) return [];
  const merged: T[] = [];

  for (const w of rawWords) {
    if (!w.word || w.word.trim().length === 0) continue;

    const prev = merged.length > 0 ? merged[merged.length - 1] : null;

    // Check if current token starts with non-initial char OR previous token ends with leading vowel
    const isNonInitial = Boolean(prev && THAI_NON_INITIAL.test(w.word));
    const isPrevIncomplete = Boolean(prev && THAI_TRAILING_INCOMPLETE.test(prev.word.trimEnd()));

    if (prev && (isNonInitial || isPrevIncomplete)) {
      // Attach to previous word
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
