'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Play,
  Music,
  Smartphone,
  Tv,
  Square,
  Sparkles,
  Upload,
} from 'lucide-react';
import { loadGoogleFont } from '@/lib/fonts';
import { saveVideoToCache } from '@/lib/video-cache';
import { useCaptionSync } from '@/hooks/use-caption-sync';
import { TikTokSafeZone } from './tiktok-safe-zone';
import { VideoControls } from './video-player/video-controls';
import { TimelineScrubber } from './video-player/timeline-scrubber';
import { SubtitleOverlay } from './video-player/subtitle-overlay';

interface Props {
  className?: string;
  onSeekRequested?: (time: number) => void;
}

export function VideoPlayer({ className = '' }: Props) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const file = useAppStore((s) => s.file);
  const captions = useAppStore((s) => s.captions);
  const currentTime = useAppStore((s) => s.currentTime);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const style = useAppStore((s) => s.style);
  const setStyle = useAppStore((s) => s.setStyle);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const setMediaDuration = useAppStore((s) => s.setMediaDuration);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const setAspectRatio = useAppStore((s) => s.setAspectRatio);
  const showTikTokSafeZone = useAppStore((s) => s.showTikTokSafeZone);
  const setShowTikTokSafeZone = useAppStore((s) => s.setShowTikTokSafeZone);
  const seekTarget = useAppStore((s) => s.seekTarget);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projectTitle = useAppStore((s) => s.projectTitle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoDisplayRef = useRef<HTMLDivElement>(null);
  const canvasInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(mediaDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 360, h: 640 });

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Measure actual rendered canvas size dynamically for WYSIWYG scaling
  useEffect(() => {
    if (!videoDisplayRef.current) return;
    const updateSize = () => {
      if (videoDisplayRef.current) {
        const w = videoDisplayRef.current.clientWidth;
        const h = videoDisplayRef.current.clientHeight;
        if (w > 0 && h > 0) setContainerSize({ w, h });
      }
    };
    updateSize();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }
      }
    });
    ro.observe(videoDisplayRef.current);
    return () => ro.disconnect();
  }, []);

  const isAudioFile = useMemo(() => {
    if (!file) return false;
    return file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name);
  }, [file]);

  // Dynamically load Google Font when style.fontFamily changes
  useEffect(() => {
    if (style.fontFamily) {
      loadGoogleFont(style.fontFamily);
    }
  }, [style.fontFamily]);

  const { activeCaption, formatTime } = useCaptionSync(videoRef, isPlaying);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => console.warn('Play error:', err));
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      if (!videoRef.current) return;
      const clampedTime = Math.max(0, Math.min(time, duration || mediaDuration || 99999));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [duration, mediaDuration, setCurrentTime]
  );

  // Synchronize external seek requests from store
  useEffect(() => {
    if (!seekTarget || !videoRef.current) return;
    const targetTime = Math.max(0, Math.min(seekTarget.time, duration || mediaDuration || 99999));
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);

    if (seekTarget.autoPlay) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => console.warn('Play interrupted/failed:', err));
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [seekTarget, duration, mediaDuration, setCurrentTime]);

  // Global Spacebar & Arrow keys shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) seekTo(videoRef.current.currentTime - 2);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) seekTo(videoRef.current.currentTime + 2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seekTo, togglePlay]);

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  // Calculate visual dimensions of object-contain video area
  const visualBounds = useMemo(() => {
    let targetRatio = 9 / 16;
    if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === '1:1') targetRatio = 1;

    const containerRatio = containerSize.w / containerSize.h;
    let actualWidth = containerSize.w;
    let actualHeight = containerSize.h;

    if (containerRatio > targetRatio) {
      actualWidth = containerSize.h * targetRatio;
    } else {
      actualHeight = containerSize.w / targetRatio;
    }

    return { w: actualWidth, h: actualHeight };
  }, [containerSize, aspectRatio]);

  const aspectClass = useMemo(() => {
    if (isFullscreen) {
      return 'w-full h-full flex-1 max-h-none max-w-none aspect-auto';
    }
    switch (aspectRatio) {
      case '9:16':
        return 'w-full aspect-[9/16] max-h-[70dvh] mx-auto';
      case '16:9':
        return 'w-full aspect-[16/9] max-h-[70dvh] mx-auto';
      case '1:1':
        return 'w-full aspect-square max-h-[70dvh] mx-auto';
      default:
        return 'w-full aspect-[9/16] max-h-[70dvh] mx-auto';
    }
  }, [aspectRatio, isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`relative shrink-0 flex flex-col bg-zinc-950 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl group ${className}`}
    >
      {/* Top Studio Controls Bar */}
      <div className="w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-[#12121c] border-b border-zinc-800/80 shrink-0 select-none">
        {/* Left: Aspect Ratio Switcher */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-700/80 p-0.5 rounded-lg shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              aspectRatio === '9:16'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวตั้ง 9:16 (TikTok, Reels, Shorts)"
          >
            <Smartphone className="w-3 h-3" />
            <span>9:16</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('16:9')}
            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              aspectRatio === '16:9'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวนอน 16:9 (YouTube Widescreen)"
          >
            <Tv className="w-3 h-3" />
            <span>16:9</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('1:1')}
            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              aspectRatio === '1:1'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="จัตุรัส 1:1 (Square)"
          >
            <Square className="w-3 h-3" />
            <span>1:1</span>
          </button>
        </div>

        {/* Right: Quick Toggles */}
        <div className="flex items-center gap-1.5 min-w-0">
          {aspectRatio === '9:16' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTikTokSafeZone(!showTikTokSafeZone);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                showTikTokSafeZone
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 shadow-sm ring-1 ring-orange-500/30'
                  : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
              }`}
              title="เปิด/ปิด TikTok Safe Zone เพื่อดูพื้นที่ปลอดภัย"
            >
              <Smartphone className={`w-3 h-3 ${showTikTokSafeZone ? 'text-orange-400' : 'text-zinc-400'}`} />
              <span>Safe Zone: {showTikTokSafeZone ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStyle({ enableWordHighlight: !style.enableWordHighlight });
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
              style.enableWordHighlight
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
            }`}
            title="เปิด/ปิด การไฮไลท์คำตามเสียงพูดแบบ Real-time"
          >
            <Sparkles className={`w-3 h-3 ${style.enableWordHighlight ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span>Highlight: {style.enableWordHighlight ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Video / Audio Display Area */}
      <div
        ref={videoDisplayRef}
        onClick={togglePlay}
        className={`relative shrink-0 flex items-center justify-center bg-black cursor-pointer overflow-hidden min-h-[280px] ${aspectClass}`}
      >
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                setDuration(dur);
                setMediaDuration(dur);
              }}
              onTimeUpdate={(e) => {
                setCurrentTime(e.currentTarget.currentTime);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Audio File Visualizer */}
            {isAudioFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-2xl">
                  <Music className={`w-10 h-10 ${isPlaying ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{file?.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1">ไฟล์เสียง (Audio Mode) กำลังเล่นพร้อม Subtitle</p>
                </div>
                <div className="flex items-center gap-1 h-8">
                  {[40, 70, 30, 90, 60, 100, 50, 80, 45, 85, 30, 95, 60].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full bg-orange-500 transition-all duration-150 ${
                        isPlaying ? 'opacity-90' : 'opacity-30'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.2)) % 100)}%` : '20%',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Subtitle Overlay */}
            <SubtitleOverlay
              activeCaption={activeCaption}
              currentTime={currentTime}
              style={style}
              visualBounds={visualBounds}
            />

            {/* TikTok Safe Zone */}
            {showTikTokSafeZone && aspectRatio === '9:16' && (
              <div
                className="absolute inset-0 m-auto pointer-events-none z-30"
                style={{
                  width: `${visualBounds.w}px`,
                  height: `${visualBounds.h}px`,
                }}
              >
                <TikTokSafeZone visible={true} />
              </div>
            )}
          </>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
            {/* Background Subtitle Preview even without raw video */}
            <SubtitleOverlay
              activeCaption={activeCaption}
              currentTime={currentTime}
              style={style}
              visualBounds={visualBounds}
            />

            {/* TikTok Safe Zone */}
            {showTikTokSafeZone && aspectRatio === '9:16' && (
              <div
                className="absolute inset-0 m-auto pointer-events-none z-30"
                style={{
                  width: `${visualBounds.w}px`,
                  height: `${visualBounds.h}px`,
                }}
              >
                <TikTokSafeZone visible={true} />
              </div>
            )}

            {/* Clickable Card to Attach Video */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                canvasInputRef.current?.click();
              }}
              className="z-40 p-5 sm:p-6 rounded-3xl bg-zinc-900/90 border border-zinc-700/80 hover:border-orange-500 hover:bg-zinc-900 transition-all text-center space-y-3 shadow-2xl backdrop-blur-md cursor-pointer max-w-xs group/canvas"
            >
              <input
                ref={canvasInputRef}
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    const url = URL.createObjectURL(selected);
                    useAppStore.getState().setFile(selected);
                    useAppStore.getState().setVideoUrl(url);
                    const k = currentProjectId || projectTitle || selected.name;
                    if (k) saveVideoToCache(k, selected);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto group-hover/canvas:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover/canvas:text-orange-400 transition-colors">
                  คลิกเพื่อเลือกไฟล์วิดีโอ
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  เลือกไฟล์ {file?.name || projectTitle || 'วิดีโอต้นฉบับ'} เพื่อดูพรีวิวและส่งออก
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-xl bg-orange-500 text-zinc-950 text-xs font-bold shadow-md">
                + เชื่อมต่อวิดีโอ
              </span>
            </div>
          </div>
        )}

        {/* Big Center Play Indicator on Pause */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
            <div className="w-16 h-16 rounded-full bg-orange-500/90 text-zinc-950 flex items-center justify-center shadow-2xl transform scale-100 hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-1 fill-zinc-950" />
            </div>
          </div>
        )}
      </div>

      {/* Timeline Scrubber */}
      <TimelineScrubber
        currentTime={currentTime}
        duration={duration}
        captions={captions}
        formatTime={formatTime}
        onSeek={seekTo}
      />

      {/* Video Controls Bar */}
      <VideoControls
        isPlaying={isPlaying}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        formatTime={formatTime}
        onTogglePlay={togglePlay}
        onSeek={seekTo}
        onRateChange={handleRateChange}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
