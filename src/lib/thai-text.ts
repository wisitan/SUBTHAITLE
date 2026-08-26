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

  // Check if Intl.Segmenter is available (should be in all modern browsers and Node 16+)
  const segmenter = getThaiSegmenter();
  if (!segmenter) {
    // Fallback: return tokens as-is with basic combining-character merge
    return mergeThaiSubwordsFallback(tokens);
  }

  // Step 1: Build a continuous string with character-level timestamp mapping
  const charTimestamps: Array<{ start: number; end: number; originalToken: T }> = [];
  let fullText = '';

  for (const token of tokens) {
    const text = token.word;
    const hasLeadingSpace = /^\s/.test(text);
    const trimmed = text.trimStart();

    // Preserve word-boundary spaces from Whisper (important for English words like " Samsung")
    if (hasLeadingSpace && fullText.length > 0) {
      fullText += ' ';
      charTimestamps.push({ start: token.start, end: token.start, originalToken: token });
    }

    const len = trimmed.length;
    for (let i = 0; i < len; i++) {
      const cStart = token.start + (token.end - token.start) * (i / Math.max(len, 1));
      const cEnd = token.start + (token.end - token.start) * ((i + 1) / Math.max(len, 1));
      charTimestamps.push({ start: cStart, end: cEnd, originalToken: token });
    }
    fullText += trimmed;
  }

  // Step 2: Insert artificial space at Latin↔Thai script boundaries
  // (prevents "Samsungของ" from being treated as one word by Segmenter)
  let processedText = '';
  const processedTimestamps: Array<{ start: number; end: number; originalToken: T }> = [];

  for (let i = 0; i < fullText.length; i++) {
    if (i > 0) {
      const prevCh = fullText[i - 1];
      const currCh = fullText[i];
      const prevIsThai = /[\u0E00-\u0E7F]/.test(prevCh);
      const currIsThai = /[\u0E00-\u0E7F]/.test(currCh);
      const prevIsLatinOrNum = /[a-zA-Z0-9]/.test(prevCh);
      const currIsLatinOrNum = /[a-zA-Z0-9]/.test(currCh);

      if ((prevIsThai && currIsLatinOrNum) || (prevIsLatinOrNum && currIsThai)) {
        processedText += ' ';
        processedTimestamps.push({ 
          start: charTimestamps[i].start, 
          end: charTimestamps[i].start, 
          originalToken: charTimestamps[i].originalToken 
        });
      }
    }
    processedText += fullText[i];
    processedTimestamps.push(charTimestamps[i]);
  }

  // Step 3: Use Intl.Segmenter to properly tokenize Thai text
  const segments = Array.from(segmenter.segment(processedText));

  // Step 4: Map each segment back to timestamps
  const result: T[] = [];

  for (const seg of segments) {
    const word = seg.segment;
    if (!word.trim()) continue; // Skip whitespace segments

    const startIdx = seg.index;
    const endIdx = Math.min(startIdx + word.length - 1, processedTimestamps.length - 1);
    if (startIdx >= processedTimestamps.length) continue;

    // Retrieve original metadata (confidence, speaker, etc.) from the token that covers the start of this segment
    const baseToken = processedTimestamps[startIdx].originalToken;

    result.push({
      ...baseToken,
      word,
      start: processedTimestamps[startIdx].start,
      end: processedTimestamps[endIdx].end,
    });
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

  return result;
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
