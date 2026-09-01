import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export interface AudioExtractProgress {
  ratio: number; // 0 to 1
  stage: 'loading_engine' | 'processing' | 'completed';
  message: string;
}

/**
 * Loads ffmpeg.wasm singleton instance
 */
export async function getFFmpeg(
  onProgress?: (p: AudioExtractProgress) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  ffmpegInstance = ffmpeg;

  ffmpeg.on('log', () => {
    // optional debug log
  });

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress({
        ratio: Math.min(Math.max(progress, 0), 1),
        stage: 'processing',
        message: `กำลังสกัดไฟล์เสียง (${Math.round(progress * 100)}%)...`,
      });
    }
  });

  if (onProgress) {
    onProgress({
      ratio: 0.1,
      stage: 'loading_engine',
      message: 'กำลังโหลดเครื่องมือสกัดเสียง (ffmpeg.wasm)...',
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

/**
 * Extracts and preprocesses audio from any media file in the browser (Cost: ฿0)
 * Applies STT-optimized Audio Preprocessing Pipeline:
 *   1. highpass=f=200   — ตัดเสียงทุ้มรบกวน (พัดลม, แอร์, เสียงรถ)
 *   2. lowpass=f=7000   — ตัดเสียงแหลมสูง (เสียงจี่, ไฟฟ้า)
 *   3. loudnorm        — ปรับระดับเสียงให้สม่ำเสมอ (EBU R128)
 * Output: 16kHz mono MP3 optimized for Google Cloud STT / Whisper
 */
export async function extractAudioFromMedia(
  file: File,
  onProgress?: (p: AudioExtractProgress) => void
): Promise<Blob> {
  try {
    const ffmpeg = await getFFmpeg(onProgress);

    const inputName = `input_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const outputName = `audio_${Date.now()}.mp3`;

    if (onProgress) {
      onProgress({
        ratio: 0.3,
        stage: 'processing',
        message: 'กำลังเตรียมไฟล์...',
      });
    }

    // Write input file to virtual memory
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    if (onProgress) {
      onProgress({
        ratio: 0.4,
        stage: 'processing',
        message: 'กำลังปรับคุณภาพเสียงและลดเสียงรบกวนสำหรับ AI...',
      });
    }

    // STT-Optimized Voice Isolation & Noise Suppression Pipeline:
    // 1. afftdn=nf=-20  — ตัดเสียง Noise และดนตรีพื้นหลัง (FFT-based Denoiser)
    // 2. highpass=f=180 — ตัดเสียง Bass และเสียงเคาะดนตรีความถี่ต่ำ
    // 3. lowpass=f=4500 — ตัดเสียงแหลมสูง/เสียงฉาบดนตรีเหนือย่านเสียงมนุษย์
    // 4. loudnorm       — ปรับระดับความดังเสียงพูดให้สม่ำเสมอ (EBU R128)
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vn',                      // No video
      '-af', 'afftdn=nf=-20,highpass=f=180,lowpass=f=4500,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ar', '16000',             // 16kHz sample rate (STT standard)
      '-ac', '1',                 // Mono
      '-b:a', '128k',             // 128kbps bitrate
      outputName,
    ]);

    // Read back output file
    const data = await ffmpeg.readFile(outputName);
    const audioBlob = new Blob([data as unknown as BlobPart], { type: 'audio/mp3' });

    // Cleanup virtual memory
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore cleanup error
    }

    if (onProgress) {
      onProgress({
        ratio: 1,
        stage: 'completed',
        message: `ปรับคุณภาพเสียงสำเร็จ! ขนาด ${(audioBlob.size / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    return audioBlob;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error(
      `ไม่สามารถสกัดเสียงจากไฟล์ได้: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export interface AudioChunk {
  blob: Blob;
  startOffset: number; // in seconds
  duration: number;    // in seconds
  index: number;
  total: number;
}

/**
 * Slices preprocessed 16kHz MP3 audio into manageable chunks (150s each) using stream copy.
 * Executed in browser virtual MEMFS with -c copy, takes < 200ms for 10-30 minute clips.
 */
export async function sliceAudioIntoChunks(
  audioBlob: Blob,
  totalDuration: number,
  chunkDurationSec: number = 25
): Promise<AudioChunk[]> {
  // If audio is short (<= chunkDurationSec), return single chunk without slicing
  if (totalDuration <= chunkDurationSec) {
    return [
      {
        blob: audioBlob,
        startOffset: 0,
        duration: totalDuration,
        index: 0,
        total: 1,
      },
    ];
  }

  try {
    const ffmpeg = await getFFmpeg();
    const inputAudioName = `full_audio_${Date.now()}.mp3`;
    await ffmpeg.writeFile(inputAudioName, await fetchFile(audioBlob));

    const chunks: AudioChunk[] = [];
    const totalChunks = Math.ceil(totalDuration / chunkDurationSec);

    for (let i = 0; i < totalChunks; i++) {
      const startSec = i * chunkDurationSec;
      const durationSec = Math.min(chunkDurationSec, totalDuration - startSec);
      if (durationSec <= 0.5) break;

      const chunkFileName = `chunk_${Date.now()}_${i}.mp3`;

      // Ultra-fast stream copy slicing (< 50ms)
      await ffmpeg.exec([
        '-ss', String(startSec),
        '-t', String(durationSec),
        '-i', inputAudioName,
        '-c', 'copy',
        chunkFileName,
      ]);

      const chunkData = await ffmpeg.readFile(chunkFileName);
      const chunkBlob = new Blob([chunkData as unknown as BlobPart], { type: 'audio/mp3' });

      chunks.push({
        blob: chunkBlob,
        startOffset: startSec,
        duration: durationSec,
        index: i,
        total: totalChunks,
      });

      try {
        await ffmpeg.deleteFile(chunkFileName);
      } catch {}
    }

    try {
      await ffmpeg.deleteFile(inputAudioName);
    } catch {}

    return chunks.length > 0
      ? chunks
      : [{ blob: audioBlob, startOffset: 0, duration: totalDuration, index: 0, total: 1 }];
  } catch (err) {
    console.warn('[Audio Slicing Fallback]: Failed to slice audio, returning single blob:', err);
    return [
      {
        blob: audioBlob,
        startOffset: 0,
        duration: totalDuration,
        index: 0,
        total: 1,
      },
    ];
  }
}

