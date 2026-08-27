import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { CaptionItem, CaptionStyle } from './store';
import { generateAss } from './ass';

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
 * Fetch a Google Font TTF buffer for the subtitle renderer (libass requires TTF, not WOFF2)
 */
async function fetchFontBuffer(fontFamily: string): Promise<Uint8Array | null> {
  try {
    // 1. Get the direct TTF URL from our server-side API (which spoofs UA to bypass WOFF2)
    const apiRes = await fetch(`/api/font?family=${encodeURIComponent(fontFamily)}`);
    if (!apiRes.ok) return null;
    
    const data = await apiRes.json();
    if (!data.url) return null;

    // 2. Fetch the actual TTF binary from Google Fonts CDN
    const fontFileRes = await fetch(data.url);
    if (!fontFileRes.ok) return null;

    const arrayBuffer = await fontFileRes.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.warn(`Could not load font binary for ${fontFamily}:`, err);
    return null;
  }
}

/**
 * Burn subtitles onto video file using ffmpeg.wasm on the client-side
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
    ratio: 0.15,
    percent: 15,
    stage: 'preparing_media',
    message: 'กำลังเตรียมไฟล์วิดีโอและซับไตเติล...',
  });

  // Step 2: Write input video to virtual filesystem
  const videoData = await fetchFile(videoFile);
  await ffmpeg.writeFile('input.mp4', videoData);

  // Step 3: Generate ASS Subtitle content and write to FS
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

  const assContent = generateAss(captions, style, {
    title: 'SUBTHAITLE Burn',
    width: resWidth,
    height: resHeight,
    aspectRatio,
  });

  await ffmpeg.writeFile('subtitles.ass', assContent);

  // Step 4: Write font file if available
  try {
    await ffmpeg.createDir('fonts');
  } catch {
    // Directory might already exist
  }

  const fontBuffer = await fetchFontBuffer(style.fontFamily || 'Noto Sans Thai');
  if (fontBuffer) {
    await ffmpeg.writeFile('fonts/custom_font.ttf', fontBuffer);
  }

  // Step 5: Configure FFmpeg progress listener
  ffmpeg.on('progress', ({ progress }) => {
    // FFmpeg progress is 0.0 to 1.0
    const clampedRatio = Math.max(0, Math.min(1, progress));
    const percent = Math.round(20 + clampedRatio * 75);

    onProgress?.({
      ratio: 0.2 + clampedRatio * 0.75,
      percent,
      stage: 'burning',
      message: `กำลังเรนเดอร์และฝังซับไตเติล... ${percent}%`,
    });
  });

  // Step 6: Build FFmpeg video filters and execute
  onProgress?.({
    ratio: 0.2,
    percent: 20,
    stage: 'burning',
    message: 'เริ่มต้นการประมวลผลวิดีโอ...',
  });

  // Video filter: subtitles filter with font directory
  const vfOptions = fontBuffer
    ? 'subtitles=subtitles.ass:fontsdir=fonts'
    : 'subtitles=subtitles.ass';

  const ffmpegArgs = [
    '-i',
    'input.mp4',
    '-vf',
    vfOptions,
    '-map',
    '0:v',
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

  // Cleanup temporary virtual files
  try {
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('subtitles.ass');
    await ffmpeg.deleteFile('output.mp4');
    if (fontBuffer) {
      await ffmpeg.deleteFile('fonts/custom_font.ttf');
    }
  } catch (cleanErr) {
    console.warn('Error cleaning up virtual ffmpeg files:', cleanErr);
  }

  onProgress?.({
    ratio: 1.0,
    percent: 100,
    stage: 'completed',
    message: 'เรนเดอร์วิดีโอพร้อมซับไตเติลสำเร็จเรียบร้อย! 🎉',
  });

  return outputBlob;
}
