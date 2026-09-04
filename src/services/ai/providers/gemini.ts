import { STTProvider, STTResult, STTWord, STTOptions } from '../types';

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
    options?: STTOptions
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
    const durationRule =
      options?.duration && options.duration > 0
        ? `- Audio Timeline & Boundary: The exact audio duration is ${options.duration.toFixed(1)} seconds. All word timestamps MUST accurately fit within [0.0 to ${options.duration.toFixed(1)}s]. The final word MUST conclude at or before ${options.duration.toFixed(1)}s.`
        : '';

    const prompt = `Transcribe this Thai speech audio verbatim for synchronized video subtitles with precise word-level timestamps.
Strict Rules:
${durationRule ? durationRule + '\n' : ''}- Output language: Thai (preserve natural spoken Thai, technical terms, and English loanwords verbatim).
- Word-Level Granularity: Provide STRICT single-word granularity in the "words" array. Each item must represent a single spoken word. NEVER combine multiple Thai words together (e.g. separate "ตัว" and "นี้", separate "ไร้" and "สาย", separate "ใช้" and "งาน", separate "มา" and "รีวิว").
- Anti-Drift & Realistic Pacing:
  * Do NOT stretch word durations. Spoken syllables in continuous speech typically take only 0.12s - 0.22s.
  * All word timestamps MUST stay strictly synchronized with speech pace without lagging behind or accumulating delay towards the end.
- Anti-Anticipation & Silence Tracking:
  * Speakers naturally take pauses, breathe, or hesitate between sentences and clauses (e.g. 0.5s - 2.5s of silence).
  * CRITICAL: NEVER anticipate or start a word during a pause or silence.
  * The "start" timestamp of any word after a pause MUST strictly mark the exact second the speaker resumes vocalizing.
  * If the audio is silent between 1.7s and 3.4s, the next word MUST start at 3.4s, NOT 2.5s or 2.9s.
- Audio Alignment: "start" must be the exact second when the speaker begins uttering that specific word. "end" must be the exact second when the utterance of that word ends. Timestamps must strictly reflect acoustic timing.
- DO NOT output any commas (,) or periods (.) in word text.
- Return ONLY a valid JSON object matching this schema:
{
  "fullText": "สวัสดีครับ วันนี้เรามารีวิว",
  "duration": 5.2,
  "words": [
    { "word": "สวัสดี", "start": 0.10, "end": 0.65 },
    { "word": "ครับ", "start": 0.65, "end": 1.00 },
    { "word": "วัน", "start": 2.80, "end": 3.05 },
    { "word": "นี้", "start": 3.05, "end": 3.30 },
    { "word": "เรา", "start": 3.30, "end": 3.55 },
    { "word": "มา", "start": 3.55, "end": 3.80 },
    { "word": "รีวิว", "start": 3.80, "end": 4.30 }
  ]
}`;

    // Available models supporting multimodal audio (prioritize highest accuracy flash models)
    // If fastFail is enabled (e.g. probing free tier for paid users), test only the primary model
    const modelsToTry = options?.fastFail
      ? ['gemini-3.8-flash']
      : [
          'gemini-3.8-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-flash-latest',
        ];
    const perRequestTimeout = options?.timeoutMs || (options?.fastFail ? 7000 : 25000);
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(perRequestTimeout),
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
                temperature: 0.0,
              },
            }),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[Gemini STT] Model ${model} returned status ${res.status}: ${errBody.slice(0, 150)}`);

          const is429 =
            res.status === 429 ||
            errBody.includes('RESOURCE_EXHAUSTED') ||
            errBody.includes('quota') ||
            errBody.includes('rate limit');

          const is503 =
            res.status === 503 ||
            errBody.includes('high demand') ||
            errBody.includes('UNAVAILABLE');

          const isRateLimit = is429 || is503;

          const err = new GeminiAPIError(
            res.status,
            isRateLimit
              ? 'GEMINI_RATE_LIMIT_EXCEEDED'
              : `Gemini API error (${res.status}): ${errBody.slice(0, 150)}`,
            isRateLimit
          );
          lastError = err;

          // If quota exhausted (429), stop trying other models under the same key
          if (is429) {
            break;
          }

          // If 503 (high demand on this model), brief pause and try the next model in modelsToTry
          if (is503) {
            await new Promise((r) => setTimeout(r, 600));
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
            word: w.word.replace(/,/g, '').trim(),
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
          .replace(/,/g, '')
          .trim();

        console.log(`[Gemini STT] Transcribed successfully using ${model} (${words.length} words, duration ${duration}s)`);

        return {
          text: fullText,
          duration,
          words,
          language: 'th',
          provider: 'gemini',
          model,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Gemini STT] Error trying model ${model}:`, err);
      }
    }

    throw lastError || new Error('[Gemini STT] Failed to transcribe with all available Gemini models.');
  }
}
