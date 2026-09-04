import { describe, it, expect } from 'vitest';
import {
  cleanThaiText,
  resegmentThaiWords,
  formatCaptionWordsText,
  isPunctuationOnly,
  thaiDigitsToArabic,
} from '../thai-text';

describe('thai-text processing and segmentation', () => {
  it('cleanThaiText removes repetitive hallucinations and extra spaces', () => {
    const raw = '  [เสียงดนตรี] สวัสดีครับ   ทุกท่าน (เสียงปรบมือ)  ';
    const cleaned = cleanThaiText(raw);
    expect(cleaned).toBe('สวัสดีครับ ทุกท่าน');
  });

  it('resegmentThaiWords combines split Thai syllables correctly', () => {
    // Simulate Whisper BPE split: "คื" + "อ" -> "คือ"
    const tokens = [
      { word: 'คื', start: 0.0, end: 0.2 },
      { word: 'อ', start: 0.2, end: 0.4 },
      { word: 'อะไร', start: 0.4, end: 0.8 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result.length).toBeGreaterThan(0);
    const combinedText = result.map((t) => t.word).join('');
    expect(combinedText).toContain('คือ');
    expect(combinedText).toContain('อะไร');
  });

  it('resegmentThaiWords preserves word timestamps accurately without cumulative drift', () => {
    const tokens = [
      { word: 'สวัสดี', start: 0.0, end: 0.4 },
      { word: 'ครับ', start: 0.45, end: 0.75 },
      { word: 'วัน', start: 1.5, end: 2.2 },
      { word: 'นี้', start: 2.2, end: 3.0 }, // 1.5s speech segment
      { word: 'เรา', start: 3.0, end: 3.15 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result[0].start).toBe(0.0);
    expect(result[0].end).toBe(0.4);
    expect(result[1].start).toBe(0.45);
    expect(result[1].end).toBe(0.75);
    // Crucial: "เรา" must not drift earlier due to preceding prolonged speech
    const weWord = result.find((w) => w.word === 'เรา');
    expect(weWord).toBeDefined();
    expect(weWord?.start).toBe(3.0);
    expect(weWord?.end).toBe(3.15);
  });

  it('resegmentThaiWords preserves hyphenated terms like Type-C and Wi-Fi', () => {
    const tokens = [
      { word: 'Type', start: 1.0, end: 1.3 },
      { word: '-', start: 1.3, end: 1.35 },
      { word: 'C', start: 1.35, end: 1.6 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result.length).toBe(1);
    expect(result[0].word).toBe('Type-C');
    expect(result[0].start).toBe(1.0);
    expect(result[0].end).toBe(1.6);
  });

  it('resegmentThaiWords splits mixed compound tokens within their exact time window', () => {
    const tokens = [
      { word: 'ราคา399บาท', start: 2.0, end: 2.9 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result.length).toBe(3);
    expect(result.map((r) => r.word)).toEqual(['ราคา', '399', 'บาท']);
    expect(result[0].start).toBe(2.0);
    expect(result[2].end).toBe(2.9);
  });

  it('resegmentThaiWords preserves decimal numbers in compound tokens', () => {
    const tokens = [
      { word: 'ราคา399.50บาท', start: 2.0, end: 2.9 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result.length).toBe(3);
    expect(result.map((r) => r.word)).toEqual(['ราคา', '399.50', 'บาท']);
  });

  it('resegmentThaiWords does not glue hyphens or dashes across pauses', () => {
    const tokens = [
      { word: 'สวัสดีครับ', start: 0.0, end: 1.0 },
      { word: '—', start: 2.5, end: 2.6 }, // 1.5s pause
      { word: 'วันนี้', start: 4.0, end: 4.5 }, // 1.4s pause
    ];

    const result = resegmentThaiWords(tokens);
    // Standalone dash across pauses must NOT swallow adjacent sentences
    const dash = result.find((r) => r.word === '—');
    expect(dash).toBeDefined();
    expect(dash?.start).toBe(2.5);
    expect(dash?.end).toBe(2.6);

    const firstWord = result[0];
    expect(firstWord.start).toBe(0.0);
    const lastWordBeforeDash = result.find((r) => r.word === 'ครับ');
    expect(lastWordBeforeDash?.end).toBe(1.0);

    const todayWord = result.find((r) => r.word === 'วัน' || r.word === 'วันนี้');
    expect(todayWord).toBeDefined();
    expect(todayWord?.start).toBe(4.0);
  });

  it('isPunctuationOnly identifies punctuation characters accurately', () => {
    expect(isPunctuationOnly('...')).toBe(true);
    expect(isPunctuationOnly('!?')).toBe(true);
    expect(isPunctuationOnly('สวัสดี')).toBe(false);
  });

  it('thaiDigitsToArabic converts Thai numerals to Arabic digits', () => {
    expect(thaiDigitsToArabic('วันที่ ๑๒ มกราคม ๒๕๖๙')).toBe('วันที่ 12 มกราคม 2569');
  });

  it('formatCaptionWordsText formats array of words without extra spacing in Thai', () => {
    const words = [
      { word: 'สวัสดี' },
      { word: 'ครับ' },
      { word: 'ทุกคน' },
    ];
    const formatted = formatCaptionWordsText(words);
    expect(formatted).toBe('สวัสดีครับทุกคน');
  });
});
