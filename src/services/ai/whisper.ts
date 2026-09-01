import { AcousticWord } from './alignment';

/**
 * ⚡ Extract Real Acoustic WORD Boundaries from Whisper (VAD / Speech Energy boundaries)
 */
export async function fetchWhisperAcousticWords(
  audioBuffer: Buffer,
  language: string = 'th'
): Promise<AcousticWord[] | null> {
  const groqApiKey = (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '').trim();
  const openAiApiKey = (process.env.OPENAI_API_KEY || '').trim();

  // 1. Try OpenAI Whisper API directly (supports timestamp_granularities="word")
  if (openAiApiKey) {
    try {
      const openAiBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
      const openAiForm = new FormData();
      openAiForm.append('file', openAiBlob, 'audio.mp3');
      openAiForm.append('model', 'whisper-1');
      openAiForm.append('response_format', 'verbose_json');
      openAiForm.append('language', language === 'th' ? 'th' : language);
      openAiForm.append('temperature', '0.0');
      openAiForm.append('timestamp_granularities[]', 'word');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiApiKey}` },
        signal: AbortSignal.timeout(8000),
        body: openAiForm,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.words) && data.words.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.words.map((w: any) => ({
            word: w.word,
            start: parseFloat(w.start),
            end: parseFloat(w.end),
          }));
        }
      }
    } catch (err) {
      console.warn('[Whisper Acoustic Words OpenAI Warning]:', err);
    }
  }

  // 2. Fallback to Groq if OpenAI is not configured or fails
  if (groqApiKey) {
    try {
      const groqBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
      const groqForm = new FormData();
      groqForm.append('file', groqBlob, 'audio.mp3');
      groqForm.append('model', 'whisper-large-v3');
      groqForm.append('response_format', 'verbose_json');
      groqForm.append('language', language === 'th' ? 'th' : language);
      groqForm.append('temperature', '0.0');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        signal: AbortSignal.timeout(8000),
        body: groqForm,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.segments.map((s: any) => ({
            word: s.text,
            start: parseFloat(s.start),
            end: parseFloat(s.end),
          }));
        }
      }
    } catch (err) {
      console.warn('[Whisper Acoustic Words Groq Warning]:', err);
    }
  }

  return null;
}
