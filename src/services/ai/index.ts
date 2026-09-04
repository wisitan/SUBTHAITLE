import { STTProvider, STTResult } from './types';
import { GeminiSTTProvider } from './providers/gemini';
import { GroqSTTProvider } from './providers/groq';
import { OpenAISTTProvider } from './providers/openai';
import { DeepgramSTTProvider } from './providers/deepgram';
import { GoogleSTTProvider } from './providers/google';
import { alignLinguisticWithAcoustic } from '@/lib/audio-alignment';

export * from './types';

const providers: Record<string, STTProvider> = {
  gemini: new GeminiSTTProvider(),
  groq: new GroqSTTProvider(),
  openai: new OpenAISTTProvider(),
  deepgram: new DeepgramSTTProvider(),
  google: new GoogleSTTProvider(),
};

/**
 * Get configured or specified STT provider instance
 */
export function getSTTProvider(providerName?: string): STTProvider {
  const selectedName =
    providerName ||
    process.env.STT_PROVIDER?.toLowerCase() ||
    'gemini';

  const provider = providers[selectedName];
  if (!provider) {
    console.warn(`[STT Service] Provider "${selectedName}" not found, falling back to gemini or groq.`);
    return providers.gemini || providers.groq;
  }
  return provider;
}

/**
 * Main transcribe entrypoint.
 * Transcribes audio buffer with Dual-Engine Parallel Fusion:
 * Combining Gemini's 100% Thai linguistic accuracy with Groq Whisper's frame-level acoustic timestamps.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  options?: {
    provider?: string;
    language?: string;
    apiKey?: string;
    mode?: 'free' | 'credits' | string;
    duration?: number;
    attempt?: number;
  }
): Promise<STTResult> {
  const provider = getSTTProvider(options?.provider);
  const isPaidUser = options?.mode === 'credits';

  console.log(`[STT Service] Transcribing audio with provider: ${provider.name} (Tier: ${isPaidUser ? 'Paid' : 'Free'})`);

  // --- Dual-Tier & Dual-Engine Fusion Routing ---
  if (provider.name === 'gemini') {
    const freeKey = process.env.GEMINI_FREE_API_KEY || process.env.GEMINI_API_KEY;
    const paidKey = process.env.GEMINI_PAID_API_KEY;
    const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (isPaidUser) {
      // 1. Paid User: Gemini primary engine (probe free first or escalate to paidKey) + Groq Whisper acoustic sync
      const geminiTask = (async (): Promise<STTResult> => {
        try {
          console.log('[STT Service] [Paid User] Trying Gemini Free Tier first to save credits...');
          return await provider.transcribe(audioBuffer, {
            ...options,
            apiKey: freeKey,
            fastFail: true,
            timeoutMs: 7000,
          });
        } catch (err: unknown) {
          console.warn('[STT Service] [Paid User] Gemini Free tier failed or congested. Escalating to Gemini Paid Tier...', err);
          if (paidKey) {
            return await provider.transcribe(audioBuffer, {
              ...options,
              apiKey: paidKey,
              fastFail: true,
              timeoutMs: 40000,
            });
          }
          throw err;
        }
      })();

      const isShortClip = !options?.duration || options.duration <= 130;
      if (groqKey && isShortClip) {
        const [geminiSettled, groqSettled] = await Promise.allSettled([
          geminiTask,
          providers.groq.transcribe(audioBuffer, { ...options, apiKey: groqKey }),
        ]);

        if (geminiSettled.status === 'fulfilled' && groqSettled.status === 'fulfilled') {
          console.log('[STT Service] [Paid User] Dual-Engine Fusion succeeded!');
          return alignLinguisticWithAcoustic(geminiSettled.value, groqSettled.value);
        }

        if (geminiSettled.status === 'fulfilled') {
          return {
            ...geminiSettled.value,
            provider: geminiSettled.value.provider || 'gemini',
            model: geminiSettled.value.model || 'gemini-3.8-flash',
          };
        }

        throw geminiSettled.reason || new Error('Paid transcription failed.');
      } else {
        // Long clip (> 2 minutes) or no Groq key: use Gemini directly for stability and quota preservation
        const res = await geminiTask;
        return {
          ...res,
          provider: res.provider || 'gemini',
          model: res.model || 'gemini-3.8-flash',
        };
      }
    } else {
      // 2. Free User: Dual-Engine Parallel Fusion (Gemini + Groq Whisper)
      if (freeKey && groqKey) {
        console.log('[STT Service] [Free User] Running Dual-Engine Parallel Fusion (Gemini + Groq Whisper)...');
        const [geminiSettled, groqSettled] = await Promise.allSettled([
          provider.transcribe(audioBuffer, { ...options, apiKey: freeKey }),
          providers.groq.transcribe(audioBuffer, { ...options, apiKey: groqKey }),
        ]);

        if (geminiSettled.status === 'fulfilled' && groqSettled.status === 'fulfilled') {
          console.log('[STT Service] [Free User] Dual-Engine Fusion succeeded! Fusing linguistic & acoustic outputs...');
          return alignLinguisticWithAcoustic(geminiSettled.value, groqSettled.value);
        }

        if (geminiSettled.status === 'fulfilled') {
          console.warn('[STT Service] [Free User] Groq Whisper failed or timed out. Falling back to Gemini alone:', groqSettled.status === 'rejected' ? groqSettled.reason : null);
          return {
            ...geminiSettled.value,
            provider: geminiSettled.value.provider || 'gemini',
            model: geminiSettled.value.model || 'gemini-3.8-flash',
          };
        }

        if (groqSettled.status === 'fulfilled') {
          console.warn('[STT Service] [Free User] Gemini Free tier failed/congested. Seamlessly falling back to Groq Whisper:', geminiSettled.status === 'rejected' ? geminiSettled.reason : null);
          return {
            ...groqSettled.value,
            provider: 'groq',
            model: groqSettled.value.model || 'whisper-large-v3',
            providerFallback: 'groq',
          };
        }

        throw geminiSettled.reason || groqSettled.reason || new Error('Both Gemini and Groq transcription failed.');
      }

      // Standalone Gemini Free flow if groqKey not present
      try {
        const res = await provider.transcribe(audioBuffer, { ...options, apiKey: freeKey });
        return {
          ...res,
          provider: res.provider || 'gemini',
          model: res.model || 'gemini-3.8-flash',
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[STT Service] [Free User] Gemini Free tier error/limit:', msg);

        const currentAttempt = options?.attempt ?? 1;
        if (currentAttempt >= 3 && groqKey) {
          console.log(`[STT Service] [Free User] Gemini models all congested (attempt ${currentAttempt}). Seamlessly falling back to Groq Whisper...`);
          try {
            const fallbackResult = await providers.groq.transcribe(audioBuffer, { ...options, apiKey: groqKey });
            return {
              ...fallbackResult,
              provider: 'groq',
              model: fallbackResult.model || 'whisper-large-v3',
              providerFallback: 'groq',
            };
          } catch (groqErr) {
            console.error('[STT Service] [Free User] Groq fallback also failed:', groqErr);
          }
        }

        throw err;
      }
    }
  }

  // Generic provider invocation with fallback
  try {
    const res = await provider.transcribe(audioBuffer, options);
    return {
      ...res,
      provider: res.provider || provider.name,
      model: res.model || 'default',
    };
  } catch (err) {
    console.error(`[STT Service] Primary provider ${provider.name} failed:`, err);

    // Auto-fallback: if Groq fails or rate limits, try OpenAI or Google if keys are available
    if (provider.name !== 'groq' && process.env.GROQ_API_KEY) {
      console.log('[STT Service] Falling back to Groq Whisper...');
      const fallbackResult = await providers.groq.transcribe(audioBuffer, options);
      return {
        ...fallbackResult,
        provider: 'groq',
        model: fallbackResult.model || 'whisper-large-v3',
        providerFallback: 'groq',
      };
    }

    if (provider.name !== 'openai' && process.env.OPENAI_API_KEY) {
      console.log('[STT Service] Falling back to OpenAI Whisper...');
      const fallbackResult = await providers.openai.transcribe(audioBuffer, options);
      return {
        ...fallbackResult,
        provider: 'openai',
        model: fallbackResult.model || 'whisper-1',
        providerFallback: 'openai',
      };
    }

    throw err;
  }
}
