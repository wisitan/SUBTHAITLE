export interface STTWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  confidence?: number;
}

export interface STTResult {
  text: string;
  duration: number;
  words: STTWord[];
  language: string;
}

export interface STTOptions {
  language?: string;
  apiKey?: string;
  fastFail?: boolean;
  timeoutMs?: number;
  mode?: 'free' | 'credits' | string;
  provider?: string;
}

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult>;
}
