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
  }
): Promise<STTResult> {
  const provider = getSTTProvider(options?.provider);
  console.log(`[STT Service] Transcribing audio with provider: ${provider.name}`);

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
