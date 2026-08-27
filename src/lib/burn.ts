import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { CaptionItem, CaptionStyle } from './store';
import { generateCaptionImageSequence } from './canvas-subtitle';

export type VideoResolution = '720p' | '1080p' | '4k' | 'original';

export interface BurnProgress {
  ratio: number; // 0 to 1
  percent: number; // 0 to 100
  stage: 'loading_engine' | 'preparing_media' | 'burning' | 'finishing' | 'completed' | 'error';
  message: string;
}

export interface BurnVideoOptions {
  videoFile: File | Blob;
  captions: CaptionItem[];
  style: CaptionStyle;
  resolution?: VideoResolution;
  onProgress?: (progress: BurnProgress) => void;
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

let ffmpegInstance: FFmpeg | null = null;

/**
 * Terminate and reset the running FFmpeg WebAssembly worker
 */
export function cancelBurn(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (e) {
      console.warn('Error terminating FFmpeg instance:', e);
    }
    ffmpegInstance = null;
  }
}

/**
 * Initialize or get the existing FFmpeg WebAssembly instance
 */
export async function getFFmpegInstance(onProgress?: (progress: BurnProgress) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  onProgress?.({
    ratio: 0.05,
    percent: 5,
    stage: 'loading_engine',
    message: 'กำลังโหลด FFmpeg WebAssembly Engine...',
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg WebAssembly:', error);
    throw new Error('ไม่สามารถโหลดตัวประมวลผลวิดีโอ (FFmpeg) ในเบราว์เซอร์ได้');
  }
}

/**
 * Helper to get exact video duration from File/Blob
 */
async function getVideoDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur = video.duration || 60;
      URL.revokeObjectURL(video.src);
      resolve(dur);
    };
    video.onerror = () => {
      resolve(60);
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Burn subtitles onto video file using Canvas 2D frame rendering + FFmpeg Concat Overlay
 * Guarantees 100% WYSIWYG match with Live Preview.
 */
export async function burnSubtitlesToVideo({
  videoFile,
  captions,
  style,
  resolution = '1080p',
  onProgress,
  aspectRatio = '9:16',
}: BurnVideoOptions): Promise<Blob> {
  if (!captions || captions.length === 0) {
    throw new Error('ไม่มีรายการซับไตเติลสำหรับเรนเดอร์');
  }

  // Step 1: Load FFmpeg Engine
  const ffmpeg = await getFFmpegInstance(onProgress);

  onProgress?.({
    ratio: 0.1,
    percent: 10,
    stage: 'preparing_media',
    message: 'กำลังเตรียมไฟล์วิดีโอและคำนวณไทม์ไลน์...',
  });

  // Calculate target canvas resolution
  let resWidth = 1080;
  let resHeight = 1920;
  if (aspectRatio === '16:9') {
    resWidth = 1920;
    resHeight = 1080;
  } else if (aspectRatio === '1:1') {
    resWidth = 1080;
    resHeight = 1080;
  }

  // Scale resolution if 720p or 4k selected
  if (resolution === '720p') {
    resWidth = Math.round(resWidth * (720 / 1080));
    resHeight = Math.round(resHeight * (720 / 1080));
  } else if (resolution === '4k') {
    resWidth = Math.round(resWidth * 2);
    resHeight = Math.round(resHeight * 2);
  }

  // Step 2: Get media duration
  const videoDuration = await getVideoDuration(videoFile);

  // Step 3: Render Subtitle frames with Canvas (WYSIWYG)
  const imageSequence = await generateCaptionImageSequence(
    {
      captions,
      style,
      videoWidth: resWidth,
      videoHeight: resHeight,
      videoDuration,
      aspectRatio,
    },
    (pct, msg) => {
      onProgress?.({
        ratio: 0.1 + (pct / 100) * 0.15,
        percent: Math.round(10 + pct * 0.15),
        stage: 'preparing_media',
        message: msg,
      });
    }
  );

  onProgress?.({
    ratio: 0.25,
    percent: 25,
    stage: 'preparing_media',
    message: 'กำลังส่งไฟล์เข้าสู่ตัวประมวลผลวิดีโอ...',
  });

  const createdFileNames: string[] = ['input.mp4', 'subtitles.txt', 'output.mp4'];

  try {
    // Step 4: Write input video, ffconcat script, and frame PNGs to FFmpeg MEMFS
    const videoData = await fetchFile(videoFile);
    await ffmpeg.writeFile('input.mp4', videoData);

    await ffmpeg.writeFile(
      'subtitles.txt',
      new TextEncoder().encode(imageSequence.concatFileContent)
    );

    for (const frame of imageSequence.frames) {
      await ffmpeg.writeFile(frame.filename, frame.data);
      createdFileNames.push(frame.filename);
    }

    // Step 5: Configure FFmpeg progress listener
    ffmpeg.on('progress', ({ progress }) => {
      const clampedRatio = Math.max(0, Math.min(1, progress));
      const percent = Math.round(25 + clampedRatio * 70);

      onProgress?.({
        ratio: 0.25 + clampedRatio * 0.7,
        percent,
        stage: 'burning',
        message: `กำลังเรนเดอร์และประกอบวิดีโอ... ${percent}%`,
      });
    });

    onProgress?.({
      ratio: 0.28,
      percent: 28,
      stage: 'burning',
      message: 'เริ่มต้นการประกอบวิดีโอ...',
    });

    // Step 6: Execute FFmpeg with Concat Demuxer & Overlay
    const ffmpegArgs = [
      '-i',
      'input.mp4',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'subtitles.txt',
      '-filter_complex',
      `[0:v]scale=${resWidth}:${resHeight}[bg];[bg][1:v]overlay=0:0[outv]`,
      '-map',
      '[outv]',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      'output.mp4',
    ];

    await ffmpeg.exec(ffmpegArgs);

    onProgress?.({
      ratio: 0.98,
      percent: 98,
      stage: 'finishing',
      message: 'กำลังประกอบไฟล์วิดีโอขั้นสุดท้าย...',
    });

    // Step 7: Read output file
    const outputData = await ffmpeg.readFile('output.mp4');
    const uint8 = typeof outputData === 'string'
      ? new TextEncoder().encode(outputData)
      : new Uint8Array(outputData as Uint8Array);
    const outputBlob = new Blob([uint8.buffer as ArrayBuffer], { type: 'video/mp4' });

    onProgress?.({
      ratio: 1.0,
      percent: 100,
      stage: 'completed',
      message: 'เรนเดอร์วิดีโอพร้อมซับไตเติลสำเร็จเรียบร้อย! 🎉',
    });

    return outputBlob;
  } finally {
    // Cleanup temporary virtual files to prevent WASM memory leaks under all circumstances
    for (const fname of createdFileNames) {
      try {
        await ffmpeg.deleteFile(fname);
      } catch {}
    }
  }
}
