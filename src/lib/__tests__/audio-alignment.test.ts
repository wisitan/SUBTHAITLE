import { describe, it, expect } from 'vitest';
import {
  alignLinguisticWithAcousticWords,
  alignLinguisticWithAcoustic,
} from '../audio-alignment';
import { STTWord, STTResult } from '@/services/ai/types';

describe('audio-alignment engine', () => {
  it('correctly maps Gemini words onto Whisper acoustic timestamps despite Whisper typos', () => {
    const geminiWords: STTWord[] = [
      { word: 'สวัสดี', start: 0.10, end: 0.65 },
      { word: 'ครับ', start: 0.65, end: 1.00 },
      { word: 'วัน', start: 2.80, end: 3.05 },
      { word: 'นี้', start: 3.05, end: 3.30 },
      { word: 'เรา', start: 3.30, end: 3.55 },
      { word: 'มา', start: 3.55, end: 3.80 },
      { word: 'รีวิว', start: 3.80, end: 4.30 },
    ];

    const whisperWords: STTWord[] = [
      { word: 'สวัดดี', start: 0.20, end: 0.70 }, // Whisper typo, acoustic time
      { word: 'คับ', start: 0.72, end: 0.95 },   // Whisper typo, acoustic time
      { word: 'วัน', start: 2.10, end: 2.35 },   // Exact acoustic start after silence
      { word: 'นี้', start: 2.35, end: 2.60 },
      { word: 'เรา', start: 2.62, end: 2.85 },
      { word: 'มารีวิว', start: 2.85, end: 3.65 }, // Whisper merged word
    ];

    const fused = alignLinguisticWithAcousticWords(geminiWords, whisperWords);

    expect(fused).toHaveLength(7);
    // Correct text from Gemini
    expect(fused.map((w) => w.word)).toEqual([
      'สวัสดี',
      'ครับ',
      'วัน',
      'นี้',
      'เรา',
      'มา',
      'รีวิว',
    ]);

    // Timestamps grounded in Whisper's acoustic reality
    expect(fused[0].start).toBe(0.2);
    expect(fused[0].end).toBe(0.7);
    expect(fused[1].start).toBe(0.72);
    expect(fused[1].end).toBe(0.95);

    // Silence gap preserved (speaker silent from 0.95 to 2.10)
    expect(fused[2].start).toBe(2.1);
    expect(fused[2].end).toBe(2.35);

    // Merged Whisper token "มารีวิว" split proportionally for "มา" and "รีวิว"
    expect(fused[5].start).toBe(2.85);
    expect(fused[6].end).toBe(3.65);
  });

  it('interpolates missing words cleanly when Whisper drops a token', () => {
    const geminiWords: STTWord[] = [
      { word: 'สวัสดี', start: 0.1, end: 0.6 },
      { word: 'ครับ', start: 0.6, end: 1.0 },
      { word: 'ทุกคน', start: 1.0, end: 1.4 }, // Dropped by Whisper
      { word: 'สาย', start: 1.4, end: 1.6 },
      { word: 'Type-C', start: 1.6, end: 2.2 },
    ];

    const whisperWords: STTWord[] = [
      { word: 'สวัดดี', start: 0.2, end: 0.7 },
      { word: 'คับ', start: 0.72, end: 0.95 },
      // "ทุกคน" missing
      { word: 'สาย', start: 1.25, end: 1.45 },
      { word: 'type', start: 1.48, end: 1.75 },
      { word: 'c', start: 1.76, end: 1.95 },
    ];

    const fused = alignLinguisticWithAcousticWords(geminiWords, whisperWords);

    expect(fused).toHaveLength(5);
    expect(fused.map((w) => w.word)).toEqual([
      'สวัสดี',
      'ครับ',
      'ทุกคน',
      'สาย',
      'Type-C',
    ]);

    // "ทุกคน" should be interpolated between 0.95 and 1.25
    expect(fused[2].start).toBeGreaterThanOrEqual(0.95);
    expect(fused[2].end).toBeLessThanOrEqual(1.25);

    // "Type-C" should span from type start (1.48) to c end (1.95)
    expect(fused[4].start).toBe(1.48);
    expect(fused[4].end).toBe(1.95);
  });

  it('guarantees strict monotonic progression (start <= end <= next.start)', () => {
    const geminiWords: STTWord[] = [
      { word: 'หนึ่ง', start: 0.0, end: 0.5 },
      { word: 'สอง', start: 0.5, end: 1.0 },
      { word: 'สาม', start: 1.0, end: 1.5 },
      { word: 'สี่', start: 1.5, end: 2.0 },
    ];

    const whisperWords: STTWord[] = [
      { word: 'หนึ่ง', start: 0.1, end: 0.4 },
      { word: 'สอง', start: 0.42, end: 0.8 },
      { word: 'สาม', start: 0.82, end: 1.2 },
      { word: 'สี่', start: 1.25, end: 1.6 },
    ];

    const fused = alignLinguisticWithAcousticWords(geminiWords, whisperWords);

    for (let i = 0; i < fused.length; i++) {
      expect(fused[i].start).toBeLessThan(fused[i].end);
      if (i > 0) {
        expect(fused[i].start).toBeGreaterThanOrEqual(fused[i - 1].start);
      }
    }
  });

  it('handles empty or null inputs gracefully with fallback', () => {
    const words: STTWord[] = [{ word: 'สวัสดี', start: 0.1, end: 0.5 }];
    expect(alignLinguisticWithAcousticWords([], words)).toEqual(words);
    expect(alignLinguisticWithAcousticWords(words, [])).toEqual(words);
  });

  it('alignLinguisticWithAcoustic returns hybrid STTResult with correct metadata', () => {
    const geminiRes: STTResult = {
      text: 'สวัสดีครับ วันนี้เรามารีวิว',
      duration: 5.2,
      words: [
        { word: 'สวัสดี', start: 0.1, end: 0.5 },
        { word: 'ครับ', start: 0.5, end: 1.0 },
      ],
      language: 'th',
      provider: 'gemini',
      model: 'gemini-3.8-flash',
    };

    const whisperRes: STTResult = {
      text: 'สวัดดีคับ วันนี้เรามารีวิว',
      duration: 4.8,
      words: [
        { word: 'สวัดดี', start: 0.2, end: 0.6 },
        { word: 'คับ', start: 0.62, end: 0.95 },
      ],
      language: 'th',
      provider: 'groq',
      model: 'whisper-large-v3',
    };

    const hybrid = alignLinguisticWithAcoustic(geminiRes, whisperRes);
    expect(hybrid.provider).toBe('hybrid');
    expect(hybrid.model).toBe('Gemini + Groq Whisper Hybrid');
    expect(hybrid.text).toBe(geminiRes.text);
    expect(hybrid.words[0].word).toBe('สวัสดี');
    expect(hybrid.words[0].start).toBe(0.2);
    expect(hybrid.words[0].end).toBe(0.6);
  });

  it('safely falls back to linguistic words if character length exceeds safe threshold', () => {
    // Generate a long list of words exceeding safe threshold
    const longWord = 'สวัสดีครับทุกคนวันนี้เรามารีวิวอุปกรณ์ไอทีตัวใหม่ล่าสุด'; // 54 chars
    const largeGeminiWords: STTWord[] = Array.from({ length: 40 }, (_, i) => ({
      word: longWord,
      start: i * 5,
      end: (i + 1) * 5,
    })); // 40 * 54 = 2,160 chars (> 1,800 threshold)

    const largeWhisperWords: STTWord[] = Array.from({ length: 40 }, (_, i) => ({
      word: longWord,
      start: i * 5,
      end: (i + 1) * 5,
    }));

    const result = alignLinguisticWithAcousticWords(largeGeminiWords, largeWhisperWords);
    // Should safely fallback to largeGeminiWords without crashing or OOM
    expect(result).toHaveLength(largeGeminiWords.length);
    expect(result[0].word).toBe(longWord);
  });
});
