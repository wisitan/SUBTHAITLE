import { useEffect, useMemo, RefObject } from 'react';
import { useAppStore } from '@/lib/store';

export function formatTimeDisplay(secs: number): string {
  if (isNaN(secs) || secs < 0) return '00:00.00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function useCaptionSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  isPlaying: boolean
) {
  const captions = useAppStore((s) => s.captions);
  const currentTime = useAppStore((s) => s.currentTime);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const activeCaptionIndex = useAppStore((s) => s.activeCaptionIndex);
  const setActiveCaptionIndex = useAppStore((s) => s.setActiveCaptionIndex);

  // Find active caption index based on currentTime (strict match first, tiny tolerance fallback)
  const activeIndex = useMemo(() => {
    if (!captions || captions.length === 0) return -1;

    // 1. Strict match: currentTime is within [start, end)
    const strictIndex = captions.findIndex(
      (c) => c.start <= currentTime && currentTime < c.end
    );
    if (strictIndex !== -1) return strictIndex;

    // 2. Tolerance match: for very end of cue or between close frames
    return captions.findIndex(
      (c) => c.start <= currentTime && currentTime <= c.end + 0.05
    );
  }, [captions, currentTime]);

  // Only dispatch to store when active index genuinely changes
  useEffect(() => {
    const nextIndex = activeIndex === -1 ? null : activeIndex;
    if (activeCaptionIndex !== nextIndex) {
      setActiveCaptionIndex(nextIndex);
    }
  }, [activeIndex, activeCaptionIndex, setActiveCaptionIndex]);

  const activeCaption = activeIndex !== -1 ? captions[activeIndex] : null;

  // Sync animation frame loop for ultra-precise word highlighting while playing
  useEffect(() => {
    let animationFrameId: number;

    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        animationFrameId = requestAnimationFrame(syncTime);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(syncTime);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, videoRef, setCurrentTime]);

  return {
    activeIndex,
    activeCaption,
    formatTime: formatTimeDisplay,
  };
}
