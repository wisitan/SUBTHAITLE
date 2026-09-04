import { STTProvider, STTResult } from './types';
import { GeminiSTTProvider } from './providers/gemini';
import { GroqSTTProvider } from './providers/groq';
import { OpenAISTTProvider } from './providers/openai';
import { DeepgramSTTProvider } from './providers/deepgram';
import { GoogleSTTProvider } from './providers/google';

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
 * Transcribes audio buffer in a single step with native word-level timestamps.
 */


export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  options?: {
    provider?: string;
    language?: string;
    apiKey?: string;
    mode?: 'free' | 'credits' | string;
  }
): Promise<STTResult> {
  const provider = getSTTProvider(options?.provider);
  const isPaidUser = options?.mode === 'credits';

  console.log(`[STT Service] Transcribing audio with provider: ${provider.name} (Tier: ${isPaidUser ? 'Paid' : 'Free'})`);

  // --- Dual-Tier Gemini Engine Routing ---
  if (provider.name === 'gemini') {
    const freeKey = process.env.GEMINI_FREE_API_KEY || process.env.GEMINI_API_KEY;
    const paidKey = process.env.GEMINI_PAID_API_KEY;

    if (isPaidUser) {
      // 1. Paid User: Try Free tier first to optimize cost
      try {
        console.log('[STT Service] [Paid User] Trying Gemini Free Tier first to save credits...');
        return await provider.transcribe(audioBuffer, { ...options, apiKey: freeKey });
      } catch (err: unknown) {
        // If Free Tier fails for ANY reason (429 rate limit, 503 high demand, or server error),
        // immediately escalate to Gemini Paid Tier to guarantee 100% uptime for paid users!
        console.warn('[STT Service] [Paid User] Gemini Free tier failed or congested. Escalating to Gemini Paid Tier...', err);
        if (paidKey) {
          try {
            return await provider.transcribe(audioBuffer, { ...options, apiKey: paidKey });
          } catch (paidErr: unknown) {
            console.error('[STT Service] [Paid User] Gemini Paid tier also failed:', paidErr);
            throw paidErr;
          }
        }
        throw err;
      }
    } else {
      // 2. Free User: Use Free Tier key only
      try {
        return await provider.transcribe(audioBuffer, { ...options, apiKey: freeKey });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[STT Service] [Free User] Gemini Free tier error/limit:', msg);
        throw err;
      }
    }
  }

  // Generic provider invocation with fallback
  try {
    return await provider.transcribe(audioBuffer, options);
  } catch (err) {
    console.error(`[STT Service] Primary provider ${provider.name} failed:`, err);

    // Auto-fallback: if Groq fails or rate limits, try OpenAI or Google if keys are available
    if (provider.name !== 'groq' && process.env.GROQ_API_KEY) {
      console.log('[STT Service] Falling back to Groq Whisper...');
      return await providers.groq.transcribe(audioBuffer, options);
    }

    if (provider.name !== 'openai' && process.env.OPENAI_API_KEY) {
      console.log('[STT Service] Falling back to OpenAI Whisper...');
      return await providers.openai.transcribe(audioBuffer, options);
    }

    throw err;
  }
}
