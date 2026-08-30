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
 * Extracts audio from a video file in the browser (Cost: ฿0, 0 server bandwidth)
 * Converts to 16kHz mono MP3 optimized for Whisper transcription (ultra low file size).
 */
export async function extractAudioFromMedia(
  file: File,
  onProgress?: (p: AudioExtractProgress) => void
): Promise<Blob> {
  // If it's already an MP3 audio file, return it directly!
  const isMp3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.toLowerCase().endsWith('.mp3');
  if (isMp3) {
    if (onProgress) {
      onProgress({
        ratio: 1,
        stage: 'completed',
        message: 'ไฟล์ MP3 พร้อมใช้งานทันที',
      });
    }
    return file;
  }

  try {
    const ffmpeg = await getFFmpeg(onProgress);

    const inputName = `input_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const outputName = `audio_${Date.now()}.mp3`;

    if (onProgress) {
      onProgress({
        ratio: 0.3,
        stage: 'processing',
        message: 'กำลังเตรียมไฟล์วิดีโอ...',
      });
    }

    // Write input file to virtual memory
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    if (onProgress) {
      onProgress({
        ratio: 0.4,
        stage: 'processing',
        message: 'กำลังสกัดเฉพาะเสียงและบีบอัดสำหรับ AI (16kHz Mono MP3)...',
      });
    }

    // Convert to 16kHz mono 64kbps MP3 (Ideal for Groq / Whisper API)
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vn',                // No video
      '-ar', '16000',       // 16kHz sample rate
      '-ac', '1',           // Mono
      '-b:a', '64k',        // 64kbps bitrate
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
        message: `สกัดเสียงสำเร็จ! ขนาดไฟล์ลดเหลือ ${(audioBlob.size / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    return audioBlob;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error(
      `ไม่สามารถสกัดเสียงจากไฟล์วิดีโอได้: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
