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
    duration?: number;
    attempt?: number;
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
      // 1. Paid User: Try Free tier first to optimize cost, with fastFail (7s max)
      try {
        console.log('[STT Service] [Paid User] Trying Gemini Free Tier first to save credits...');
        const res = await provider.transcribe(audioBuffer, {
          ...options,
          apiKey: freeKey,
          fastFail: true,
          timeoutMs: 7000,
        });
        return {
          ...res,
          provider: res.provider || 'gemini',
          model: res.model || 'gemini-3.8-flash',
        };
      } catch (err: unknown) {
        // If Free Tier fails for ANY reason (429 rate limit, 503 high demand, timeout, or server error),
        // immediately escalate to Gemini Paid Tier to guarantee 100% uptime for paid users!
        console.warn('[STT Service] [Paid User] Gemini Free tier failed or congested. Escalating to Gemini Paid Tier...', err);
        if (paidKey) {
          try {
            const paidRes = await provider.transcribe(audioBuffer, {
              ...options,
              apiKey: paidKey,
              fastFail: true, // Focus directly on primary gemini-3.8-flash without looping 4 models
              timeoutMs: 40000, // Maximum 40s (7s probe + 40s = 47s, safely under Vercel's 60s limit)
            });
            return {
              ...paidRes,
              provider: paidRes.provider || 'gemini',
              model: paidRes.model || 'gemini-3.8-flash',
            };
          } catch (paidErr: unknown) {
            console.error('[STT Service] [Paid User] Gemini Paid tier also failed:', paidErr);
            throw paidErr;
          }
        }
        throw err;
      }
    } else {
      // 2. Free User: Use Free Tier key first
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

        // Smart Auto-Fallback:
        // Only trigger Groq fallback if attempt >= 2 (so Gemini gets a chance to retry from the queue first,
        // ensuring top Thai accuracy unless Gemini is consistently congested)
        const currentAttempt = options?.attempt ?? 1;
        const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (currentAttempt >= 2 && groqKey) {
          console.log(`[STT Service] [Free User] Gemini Free is congested (attempt ${currentAttempt}). Seamlessly falling back to Groq Whisper...`);
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
