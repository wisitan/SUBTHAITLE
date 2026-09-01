import { STTProvider, STTResult, STTWord } from '../types';

export class GoogleSTTProvider implements STTProvider {
  name = 'google';

  async transcribe(
    audioBuffer: Buffer,
    options?: { language?: string; apiKey?: string }
  ): Promise<STTResult> {
    const apiKey =
      options?.apiKey ||
      process.env.GOOGLE_STT_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_SPEECH_API_KEY ||
      process.env.GOOGLE_CLOUD_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_STT_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured in environment or options.');
    }

    const lang = options?.language === 'en' ? 'en-US' : 'th-TH';
    const base64Audio = audioBuffer.toString('base64');

    const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'MP3',
          languageCode: lang,
          enableWordTimeOffsets: true,
          enableAutomaticPunctuation: true,
          useEnhanced: true,
          model: 'default',
        },
        audio: {
          content: base64Audio,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Google Cloud STT error (${res.status})`;
      try {
        const json = JSON.parse(errText);
        errMsg = json.error?.message || errMsg;
      } catch {}
      throw new Error(`[Google STT] ${errMsg}`);
    }

    const data = await res.json();
    const words: STTWord[] = [];
    let fullText = '';

    for (const result of data.results || []) {
      const alt = result.alternatives?.[0];
      if (alt) {
        fullText += (fullText ? ' ' : '') + (alt.transcript || '');
        if (alt.words) {
          for (const w of alt.words) {
            const startStr = w.startTime || '0s';
            const endStr = w.endTime || '0s';
            const startSec = parseFloat(startStr.replace('s', '')) || 0;
            const endSec = parseFloat(endStr.replace('s', '')) || 0;
            words.push({
              word: w.word,
              start: startSec,
              end: endSec,
              confidence: alt.confidence || 0.95,
            });
          }
        }
      }
    }

    const duration = words.length > 0 ? words[words.length - 1].end : 0;

    return {
      text: fullText,
      duration,
      words,
      language: lang,
    };
  }
}
