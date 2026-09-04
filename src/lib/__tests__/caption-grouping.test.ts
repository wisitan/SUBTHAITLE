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

  it('splits on Thai conjunctions (Grammar-based Clause Splitting) like "แต่ว่า"', () => {
    const clauseWords: CaptionWord[] = [
      { word: 'ไมค์ตัวนี้', start: 0.0, end: 0.5 },
      { word: 'เสียงดีมาก', start: 0.5, end: 1.0 },
      { word: 'ครับ', start: 1.0, end: 1.3 },
      { word: 'แต่ว่า', start: 1.5, end: 1.8 }, // slight pause 0.2s + conjunction
      { word: 'ราคา', start: 1.8, end: 2.1 },
      { word: 'ค่อนข้าง', start: 2.1, end: 2.4 },
      { word: 'สูง', start: 2.4, end: 2.7 },
    ];

    const cues = groupWordsIntoCaptions(clauseWords, { mode: 'medium' });
    expect(cues.length).toBe(2);
    expect(cues[0].text).toContain('ไมค์ตัวนี้เสียงดีมากครับ');
    expect(cues[1].text).toContain('แต่ว่าราคาค่อนข้างสูง');
  });

  it('splits on 2-token conjunctions like "เพราะ" + "ว่า" when line is half-full', () => {
    const clauseWords: CaptionWord[] = [
      { word: 'เรา', start: 0.0, end: 0.3 },
      { word: 'ชอบ', start: 0.3, end: 0.6 },
      { word: 'รุ่นนี้', start: 0.6, end: 0.9 },
      { word: 'มาก', start: 0.9, end: 1.2 },
      { word: 'เพราะ', start: 1.25, end: 1.5 },
      { word: 'ว่า', start: 1.5, end: 1.7 },
      { word: 'มัน', start: 1.7, end: 1.9 },
      { word: 'ดีมาก', start: 1.9, end: 2.3 },
    ];

    const cues = groupWordsIntoCaptions(clauseWords, { mode: 'medium' });
    expect(cues.length).toBe(2);
    expect(cues[0].text).toContain('เราชอบรุ่นนี้มาก');
    expect(cues[1].text).toContain('เพราะว่ามันดีมาก');
  });

  it('prevents tiny orphan cards by NOT splitting when cue has too few words', () => {
    const shortStartWords: CaptionWord[] = [
      { word: 'สวัสดี', start: 0.0, end: 0.4 },
      { word: 'แต่ว่า', start: 0.5, end: 0.8 },
      { word: 'วันนี้', start: 0.8, end: 1.1 },
      { word: 'เรา', start: 1.1, end: 1.3 },
    ];

    // Only 1 word before 'แต่ว่า', so it should NOT create an orphan 1-word cue
    const cues = groupWordsIntoCaptions(shortStartWords, { mode: 'medium' });
    expect(cues.length).toBe(1);
    expect(cues[0].text).toContain('สวัสดีแต่ว่าวันนี้เรา');
  });

  it('safeguards against splitting idiomatic phrases like "แต่เช้า"', () => {
    const idiomaticWords: CaptionWord[] = [
      { word: 'เขา', start: 0.0, end: 0.3 },
      { word: 'ตื่น', start: 0.3, end: 0.6 },
      { word: 'นอน', start: 0.6, end: 0.9 },
      { word: 'แต่', start: 0.9, end: 1.1 },
      { word: 'เช้า', start: 1.1, end: 1.4 },
      { word: 'ทุกวัน', start: 1.4, end: 1.8 },
    ];

    const cues = groupWordsIntoCaptions(idiomaticWords, { mode: 'medium' });
    // "แต่" followed by "เช้า" must NOT trigger a clause split
    expect(cues.length).toBe(1);
    expect(cues[0].text).toContain('เขาตื่นนอนแต่เช้าทุกวัน');
  });

  it('trims abnormally stretched initial word in single/final cues (intro silence hallucination)', () => {
    const stretchedWords: CaptionWord[] = [
      { word: 'สวัสดี', start: 0.0, end: 2.0 }, // abnormally stretched 2.0s duration (> 1.5s)
      { word: 'ครับ', start: 2.0, end: 2.4 },
    ];

    const cues = groupWordsIntoCaptions(stretchedWords, { mode: 'medium' });
    expect(cues.length).toBe(1);
    // Should trim start to at most 0.8s before end of first word (2.0 - 0.8 = 1.2s)
    expect(cues[0].start).toBeCloseTo(1.2, 1);
    expect(cues[0].words?.[0].start).toBeCloseTo(1.2, 1);
  });
});
