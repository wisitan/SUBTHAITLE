import { STTProvider, STTResult, STTWord } from '../types';

export class GeminiAPIError extends Error {
  status: number;
  isRateLimit: boolean;

  constructor(status: number, message: string, isRateLimit: boolean) {
    super(message);
    this.name = 'GeminiAPIError';
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

export class GeminiSTTProvider implements STTProvider {
  name = 'gemini';

  async transcribe(
    audioBuffer: Buffer,
    options?: { language?: string; apiKey?: string }
  ): Promise<STTResult> {
    const apiKey =
      options?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }

    const base64Audio = audioBuffer.toString('base64');
    const prompt = `Transcribe this Thai speech audio accurately for video subtitles.
Rules:
- Transcribe verbatim in natural Thai (preserving technical terms and English loanwords where appropriate).
- Output accurate start and end timestamps in seconds for each spoken word or phrase segment.
- DO NOT output any commas (,) or periods (.).
- Return ONLY a valid JSON object matching this schema:
{
  "fullText": "ข้อความทั้งหมด",
  "duration": 15.2,
  "words": [
    { "word": "สวัสดีค่ะ", "start": 0.0, "end": 0.9 },
    { "word": "วันนี้", "start": 0.9, "end": 1.3 }
  ]
}`;

    // Available models supporting multimodal audio
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'audio/mp3',
                        data: base64Audio,
                      },
                    },
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[Gemini STT] Model ${model} returned status ${res.status}: ${errBody.slice(0, 150)}`);

          const isRateLimit =
            res.status === 429 ||
            errBody.includes('RESOURCE_EXHAUSTED') ||
            errBody.includes('quota') ||
            errBody.includes('rate limit');

          const err = new GeminiAPIError(
            res.status,
            isRateLimit
              ? 'GEMINI_RATE_LIMIT_EXCEEDED'
              : `Gemini API error (${res.status}): ${errBody.slice(0, 150)}`,
            isRateLimit
          );
          lastError = err;

          // If rate-limited on this key, do not waste time calling other models under the same key
          if (isRateLimit) {
            break;
          }
          continue;
        }

        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) continue;

        // Parse JSON output
        const parsed = JSON.parse(jsonText);

        type RawWord = { word: string; start: number; end: number; confidence?: number };
        const rawWords: RawWord[] = Array.isArray(parsed.words)
          ? parsed.words
          : Array.isArray(parsed.segments)
          ? parsed.segments.flatMap((s: { words?: RawWord[]; text?: string; start?: number; end?: number }) =>
              Array.isArray(s.words)
                ? s.words
                : [{ word: s.text || '', start: Number(s.start) || 0, end: Number(s.end) || 0 }]
            )
          : [];

        const words: STTWord[] = rawWords
          .filter((w) => w && typeof w.word === 'string' && w.word.trim().length > 0)
          .map((w) => ({
            word: w.word.replace(/(?<!\d),(?!\d)/g, '').replace(/,/g, '').trim(),
            start: Number(Number(w.start).toFixed(2)),
            end: Number(Number(w.end).toFixed(2)),
            confidence: w.confidence ?? 0.96,
          }));

        const duration =
          Number(parsed.duration) ||
          (words.length > 0 ? words[words.length - 1].end : 0);

        const fullText = (
          parsed.fullText ||
          words.map((w) => w.word).join(' ')
        )
          .replace(/(?<!\d),(?!\d)/g, '')
          .replace(/,/g, '')
          .trim();

        console.log(`[Gemini STT] Transcribed successfully using ${model} (${words.length} words, duration ${duration}s)`);

        return {
          text: fullText,
          duration,
          words,
          language: 'th',
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Gemini STT] Error trying model ${model}:`, err);
      }
    }

    throw lastError || new Error('[Gemini STT] Failed to transcribe with all available Gemini models.');
  }
}
