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

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, options?: { language?: string }): Promise<STTResult>;
}
