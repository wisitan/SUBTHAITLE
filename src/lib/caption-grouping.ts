import { CaptionItem, CaptionWord } from './store';
import { cleanThaiText } from './thai-text';

export type PacingMode = 'short' | 'medium' | 'long' | 'custom';

export interface GroupingOptions {
  mode: PacingMode;
  maxWordsPerLine: number;
  maxCharsPerLine: number;
  maxDurationSec: number;
  pauseSplitThresholdSec: number;
}

export const PACING_PRESETS: Record<Exclude<PacingMode, 'custom'>, GroupingOptions> = {
  short: {
    mode: 'short',
    maxWordsPerLine: 4,      // 3-5 words per cue
    maxCharsPerLine: 26,     // ~26 chars
    maxDurationSec: 2.0,     // 2.0s max on screen
    pauseSplitThresholdSec: 0.35, // Split if speaker pauses > 350ms
  },
  medium: {
    mode: 'medium',
    maxWordsPerLine: 8,      // 6-9 words per cue
    maxCharsPerLine: 48,     // ~48 chars
    maxDurationSec: 4.0,     // 4.0s max on screen
    pauseSplitThresholdSec: 0.50, // Split if speaker pauses > 500ms
  },
  long: {
    mode: 'long',
    maxWordsPerLine: 13,     // 10-15 words per cue
    maxCharsPerLine: 80,     // ~80 chars
    maxDurationSec: 6.5,     // 6.5s max on screen
    pauseSplitThresholdSec: 0.70, // Split if speaker pauses > 700ms
  },
};

/**
 * Groups raw word tokens with timestamps into nicely-paced subtitle cues.
 * Guaranteed zero dropped words and synchronized timestamps.
 */
export function groupWordsIntoCaptions(
  rawWords: CaptionWord[],
  optionsPartial?: Partial<GroupingOptions>
): CaptionItem[] {
  if (!rawWords || rawWords.length === 0) {
    return [];
  }

  // Filter out empty or whitespace-only words
  const validWords: CaptionWord[] = [];
  rawWords.forEach((w) => {
    if (w.word.trim().length > 0) {
      validWords.push(w);
    }
  });

  if (validWords.length === 0) return [];

  const basePreset = optionsPartial?.mode && optionsPartial.mode !== 'custom'
    ? PACING_PRESETS[optionsPartial.mode]
    : PACING_PRESETS.medium;

  const config: GroupingOptions = {
    ...basePreset,
    ...optionsPartial,
  };

  const captions: CaptionItem[] = [];
  let currentWords: CaptionWord[] = [];
  let currentStart = validWords[0].start;

  for (let i = 0; i < validWords.length; i++) {
    const word = validWords[i];
    const prevWord = currentWords[currentWords.length - 1];

    // Check pause between previous word and current word
    const isLongPause = prevWord
      ? word.start - prevWord.end >= config.pauseSplitThresholdSec
      : false;

    // Calculate current accumulated metrics
    const currentWordCount = currentWords.length;
    const currentText = currentWords.map((w) => w.word).join('');
    const potentialText = currentText + word.word;
    const currentDuration = currentWords.length > 0 ? word.end - currentStart : 0;

    const exceedsWords = currentWordCount >= config.maxWordsPerLine;
    const exceedsChars = potentialText.length > config.maxCharsPerLine;
    const exceedsDuration = currentDuration > config.maxDurationSec;

    // Split cue if:
    // 1. Long pause detected, OR
    // 2. Limit exceeded (words, chars, or duration) AND we already have at least 1 word
    if (currentWords.length > 0 && (isLongPause || exceedsWords || exceedsChars || exceedsDuration)) {
      // Close current bucket
      const cueText = cleanThaiText(currentWords.map((w) => w.word).join(''));
      if (cueText) {
        captions.push({
          id: `cue-${captions.length + 1}-${Date.now().toString(36)}`,
          start: Number(currentStart.toFixed(3)),
          end: Number(prevWord.end.toFixed(3)),
          text: cueText,
          words: [...currentWords],
        });
      }

      // Start new bucket
      currentWords = [word];
      currentStart = word.start;
    } else {
      currentWords.push(word);
    }
  }

  // Flush remaining words
  if (currentWords.length > 0) {
    const lastWord = currentWords[currentWords.length - 1];
    const cueText = cleanThaiText(currentWords.map((w) => w.word).join(''));
    if (cueText) {
      captions.push({
        id: `cue-${captions.length + 1}-${Date.now().toString(36)}`,
        start: Number(currentStart.toFixed(3)),
        end: Number(lastWord.end.toFixed(3)),
        text: cueText,
        words: [...currentWords],
      });
    }
  }

  return captions;
}

/**
 * Fallback splitter for captions that lack word-level timestamps
 * (e.g. from manual imports or long segment fallback).
 */
export function splitLongCaptions(
  captions: CaptionItem[],
  maxChars = 45,
  maxDuration = 4.0
): CaptionItem[] {
  const result: CaptionItem[] = [];

  captions.forEach((cap) => {
    const text = cleanThaiText(cap.text);
    const duration = cap.end - cap.start;

    // If already short, keep as is
    if (text.length <= maxChars && duration <= maxDuration) {
      result.push({ ...cap, text });
      return;
    }

    // Split by spaces or Thai words
    const tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) {
      result.push({ ...cap, text });
      return;
    }

    const chunkCount = Math.ceil(Math.max(text.length / maxChars, duration / maxDuration));
    const wordsPerChunk = Math.ceil(tokens.length / chunkCount);
    const timePerWord = duration / tokens.length;

    for (let i = 0; i < tokens.length; i += wordsPerChunk) {
      const chunkWords = tokens.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      const chunkStart = cap.start + i * timePerWord;
      const chunkEnd = cap.start + Math.min(i + wordsPerChunk, tokens.length) * timePerWord;

      result.push({
        id: `${cap.id}-part${Math.floor(i / wordsPerChunk) + 1}`,
        start: Number(chunkStart.toFixed(3)),
        end: Number(chunkEnd.toFixed(3)),
        text: chunkText,
      });
    }
  });

  return result;
}
