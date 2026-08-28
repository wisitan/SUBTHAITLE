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

  it('resegmentThaiWords preserves word timestamps accurately', () => {
    const tokens = [
      { word: 'สวัสดี', start: 1.0, end: 1.5 },
      { word: 'ครับ', start: 1.5, end: 2.0 },
    ];

    const result = resegmentThaiWords(tokens);
    expect(result[0].start).toBeCloseTo(1.0, 1);
    expect(result[result.length - 1].end).toBeCloseTo(2.0, 1);
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
