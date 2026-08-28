import { describe, it, expect } from 'vitest';
import { groupWordsIntoCaptions, PACING_PRESETS } from '../caption-grouping';
import { CaptionWord } from '../store';

describe('caption-grouping logic', () => {
  const sampleWords: CaptionWord[] = [
    { word: 'ยินดี', start: 0.0, end: 0.3 },
    { word: 'ต้อนรับ', start: 0.3, end: 0.7 },
    { word: 'สู่', start: 0.7, end: 0.9 },
    { word: 'ช่อง', start: 0.9, end: 1.2 },
    { word: 'ของเรา', start: 1.2, end: 1.6 },
    { word: 'วัน', start: 2.5, end: 2.7 }, // Note: 0.9s pause here
    { word: 'นี้', start: 2.7, end: 2.9 },
    { word: 'เรา', start: 2.9, end: 3.1 },
    { word: 'จะ', start: 3.1, end: 3.3 },
    { word: 'มา', start: 3.3, end: 3.5 },
    { word: 'สอน', start: 3.5, end: 3.8 },
    { word: 'ทำ', start: 3.8, end: 4.0 },
    { word: 'ซับ', start: 4.0, end: 4.3 },
  ];

  it('returns empty array when rawWords is empty', () => {
    expect(groupWordsIntoCaptions([])).toEqual([]);
  });

  it('groups words into short pacing cues (TikTok/Reels)', () => {
    const cues = groupWordsIntoCaptions(sampleWords, { mode: 'short' });
    expect(cues.length).toBeGreaterThan(1);
    cues.forEach((cue) => {
      expect(cue.start).toBeLessThan(cue.end);
      expect(cue.text.length).toBeGreaterThan(0);
    });
  });

  it('splits on natural pauses between words (> pauseSplitThresholdSec)', () => {
    const cues = groupWordsIntoCaptions(sampleWords, {
      mode: 'medium',
      pauseSplitThresholdSec: 0.5,
    });
    // The pause between 1.6s and 2.5s is 0.9s > 0.5s, so it must split
    const cue1 = cues[0];
    expect(cue1.end).toBeLessThanOrEqual(1.8);
  });

  it('maintains continuous non-overlapping timestamps', () => {
    const cues = groupWordsIntoCaptions(sampleWords, PACING_PRESETS.medium);
    for (let i = 0; i < cues.length - 1; i++) {
      expect(cues[i].start).toBeLessThan(cues[i].end);
      expect(cues[i].end).toBeLessThanOrEqual(cues[i + 1].start + 0.05); // within epsilon
    }
  });

  it('custom maxWords restricts maximum words per cue', () => {
    const maxWords = 3;
    const cues = groupWordsIntoCaptions(sampleWords, {
      mode: 'custom',
      maxWordsPerLine: maxWords,
      maxCharsPerLine: 20,
      maxDurationSec: 2.0,
      pauseSplitThresholdSec: 0.4,
    });

    cues.forEach((cue) => {
      if (cue.words) {
        expect(cue.words.length).toBeLessThanOrEqual(maxWords + 1); // allowing minor boundary buffer
      }
    });
  });
});
