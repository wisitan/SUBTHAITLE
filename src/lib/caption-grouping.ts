import { CaptionItem, CaptionWord } from './store';
import {
  cleanThaiText,
  formatCaptionWordsText,
  resegmentThaiWords,
  THAI_NON_INITIAL,
  THAI_TRAILING_INCOMPLETE,
  isClauseBoundaryWord,
} from './thai-text';

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

function trimStretchedInitialWord(words: CaptionWord[], initialStart: number): number {
  if (words.length > 0) {
    const firstW = words[0];
    const wordDur = firstW.end - firstW.start;
    if (wordDur > 1.5) {
      // Trim start to be at most 0.8s before the word ends (keeps a natural lead-in)
      firstW.start = Math.max(firstW.start, firstW.end - 0.8);
      return firstW.start;
    }
  }
  return initialStart;
}

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

  // Filter out empty or whitespace-only words and re-segment broken Thai subword tokens
  const validWords: CaptionWord[] = resegmentThaiWords(
    rawWords.filter((w) => w.word && w.word.trim().length > 0)
  );

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

    // Calculate current accumulated metrics using intelligent formatting
    const currentWordCount = currentWords.length;
    const potentialText = formatCaptionWordsText([...currentWords, word]);
    const currentDuration = currentWords.length > 0 ? word.end - currentStart : 0;

    const exceedsWords = currentWordCount >= config.maxWordsPerLine;
    const exceedsChars = potentialText.length > config.maxCharsPerLine;
    const exceedsDuration = currentDuration > config.maxDurationSec;

    // Grammar-based Clause Splitting:
    // If incoming word starts a syntactic clause (e.g. "เพราะว่า", "แต่ว่า", "ดังนั้น"),
    // split if the current bucket already has sufficient content to avoid mid-sentence breaks.
    const isClauseStart = isClauseBoundaryWord(word.word, validWords[i + 1]?.word);
    const gap = prevWord ? word.start - prevWord.end : 0;
    const minWordsForClause = config.mode === 'short' ? 2 : 3;
    const hasEnoughContent = currentWordCount >= minWordsForClause && currentDuration >= 0.7;
    const isClauseSplit = isClauseStart && hasEnoughContent && (
      gap >= 0.15 ||
      currentWordCount >= Math.floor(config.maxWordsPerLine * 0.5) ||
      potentialText.length >= Math.floor(config.maxCharsPerLine * 0.5)
    );

    // Linguistic Safety: Never split if the new cue would start with a non-initial Thai character (tone mark, vowel),
    // or if the previous word ended with a leading Thai vowel (เ, แ, โ, ใ, ไ).
    const cannotSplitHere = THAI_NON_INITIAL.test(word.word) ||
      (prevWord && THAI_TRAILING_INCOMPLETE.test(prevWord.word.trimEnd()));

    // Split cue if:
    // 1. We are at a safe split point (!cannotSplitHere), AND
    // 2. Long pause detected, OR clause boundary, OR limit exceeded (words, chars, or duration) AND we already have at least 1 word
    if (
      currentWords.length > 0 &&
      !cannotSplitHere &&
      (isLongPause || isClauseSplit || exceedsWords || exceedsChars || exceedsDuration)
    ) {
      // Close current bucket
      const cueText = cleanThaiText(formatCaptionWordsText(currentWords));
      if (cueText) {
        currentStart = trimStretchedInitialWord(currentWords, currentStart);
        const isLowConf = currentWords.some(
          (w) => w.confidence !== undefined && w.confidence < 0.6
        );
        captions.push({
          id: `cue-${captions.length + 1}-${Date.now().toString(36)}`,
          start: Number(currentStart.toFixed(3)),
          end: Number(prevWord.end.toFixed(3)),
          text: cueText,
          originalText: cueText,
          words: [...currentWords],
          lowConfidence: isLowConf,
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
    const cueText = cleanThaiText(formatCaptionWordsText(currentWords));
    if (cueText) {
      currentStart = trimStretchedInitialWord(currentWords, currentStart);
      const isLowConf = currentWords.some(
        (w) => w.confidence !== undefined && w.confidence < 0.6
      );
      captions.push({
        id: `cue-${captions.length + 1}-${Date.now().toString(36)}`,
        start: Number(currentStart.toFixed(3)),
        end: Number(lastWord.end.toFixed(3)),
        text: cueText,
        originalText: cueText,
        words: [...currentWords],
        lowConfidence: isLowConf,
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
      const chunkText = formatCaptionWordsText(chunkWords);
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
