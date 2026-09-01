import { STTProvider, STTResult, STTWord } from '../types';

export class GroqSTTProvider implements STTProvider {
  name = 'groq';

  async transcribe(
    audioBuffer: Buffer,
    options?: { language?: string; apiKey?: string }
  ): Promise<STTResult> {
    const apiKey =
      options?.apiKey ||
      process.env.GROQ_API_KEY ||
      process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured in environment or options.');
    }

    const lang = options?.language || 'th';
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
    const formData = new FormData();
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('language', lang);
    formData.append('temperature', '0.2');
    formData.append(
      'prompt',
      'วิดีโอรีวิวภาษาไทย สินค้า ไอที แกดเจ็ต: Type-C, Lightning, USB-A, USB-C, Fast Charge, Power Bank, iPhone, iPad, Apple, สายชาร์จ, หัวชาร์จ, วัตต์, แอมป์, เล่นเกม, ประกัน, รีวิว, แนะนำ, ราคา, โปรโมชั่น, สักเส้นนึง, ตัวนี้, ทนทาน, ชาร์จไว, สวัสดีครับ, สวัสดีค่ะ'
    );
    formData.append('timestamp_granularities[]', 'word');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Groq API error (${res.status})`;
      try {
        const json = JSON.parse(errText);
        errMsg = json.error?.message || errMsg;
      } catch {}
      throw new Error(`[Groq STT] ${errMsg}`);
    }

    const data = await res.json();
    const words: STTWord[] = (data.words || []).map(
      (w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: Number(w.start),
        end: Number(w.end),
        confidence: 0.95,
      })
    );

    const fullText = (data.text || '').trim();
    const duration =
      words.length > 0 ? words[words.length - 1].end : Number(data.duration) || 0;

    return {
      text: fullText,
      duration,
      words,
      language: data.language || lang,
    };
  }
}
