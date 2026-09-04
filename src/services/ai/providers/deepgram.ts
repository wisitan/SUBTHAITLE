import { STTProvider, STTResult, STTWord } from '../types';

export class DeepgramSTTProvider implements STTProvider {
  name = 'deepgram';

  async transcribe(
    audioBuffer: Buffer,
    options?: { language?: string; apiKey?: string }
  ): Promise<STTResult> {
    const apiKey =
      options?.apiKey ||
      process.env.DEEPGRAM_API_KEY ||
      process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is not configured in environment or options.');
    }

    const lang = options?.language || 'th';
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${lang}&smart_format=true&punctuate=true`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'audio/mp3',
      },
      body: new Uint8Array(audioBuffer),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Deepgram API error (${res.status})`;
      try {
        const json = JSON.parse(errText);
        errMsg = json.error || json.err_msg || errMsg;
      } catch {}
      throw new Error(`[Deepgram STT] ${errMsg}`);
    }

    const data = await res.json();
    const alt = data.results?.channels?.[0]?.alternatives?.[0];
    const fullText = alt?.transcript || '';

    const words: STTWord[] = (alt?.words || []).map(
      (w: { word: string; start: number; end: number; confidence?: number }) => ({
        word: w.word,
        start: Number(w.start),
        end: Number(w.end),
        confidence: w.confidence ?? 0.95,
      })
    );

    const duration =
      words.length > 0
        ? words[words.length - 1].end
        : Number(data.metadata?.duration) || 0;

    return {
      text: fullText,
      duration,
      words,
      language: lang,
      provider: 'deepgram',
      model: 'nova-2',
    };
  }
}
