/**
 * Generates a lightweight JPEG/WebP thumbnail from a video File, Blob, or URL
 */
export async function generateVideoThumbnail(
  source: File | Blob | string,
  timeSec: number = 0.5,
  maxDimension: number = 480
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let objectUrl = '';
    if (typeof source === 'string') {
      video.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    }

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out'));
    }, 10000);

    video.onloadedmetadata = () => {
      const targetTime = Math.min(
        timeSec,
        video.duration > 0.5 ? video.duration / 2 : 0.1
      );
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;

        let width = vw;
        let height = vh;

        if (vw > maxDimension || vh > maxDimension) {
          if (vw >= vh) {
            width = maxDimension;
            height = Math.round((vh / vw) * maxDimension);
          } else {
            height = maxDimension;
            width = Math.round((vw / vh) * maxDimension);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not create canvas 2d context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.82
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation'));
    };
  });
}
