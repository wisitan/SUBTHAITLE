'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, CaptionWord } from '@/lib/store';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Music,
  Smartphone,
  Tv,
  Square,
  Layers,
} from 'lucide-react';
import { loadGoogleFont } from '@/lib/fonts';

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
  const activeCaptionIndex = useAppStore((s) => s.activeCaptionIndex);
  const setActiveCaptionIndex = useAppStore((s) => s.setActiveCaptionIndex);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(mediaDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | 'auto'>('auto');
  const [hoverTime, setHoverTime] = useState<number | null>(null);

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

  // Format seconds to mm:ss.ms
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Find active caption index based on currentTime
  const activeIndex = useMemo(() => {
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

  // Sync animation frame loop for ultra-precise word highlighting
  useEffect(() => {
    let animationFrameId: number;

    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
      }
      animationFrameId = requestAnimationFrame(syncTime);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(syncTime);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, setCurrentTime]);

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
      const clampedTime = Math.max(0, Math.min(time, duration));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [duration, setCurrentTime]
  );

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

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seekTo(pos * duration);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
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

  // Build dynamic text-shadow & outline CSS
  const subtitleOverlayStyle: React.CSSProperties = useMemo(() => {
    const shadows: string[] = [];

    // Drop shadow
    if (style.hasShadow) {
      const hex = style.shadowColor || '#000000';
      const opacity = style.shadowOpacity ?? 0.8;
      // Convert hex + opacity to rgba
      const r = parseInt(hex.slice(1, 3) || '0', 16);
      const g = parseInt(hex.slice(3, 5) || '0', 16);
      const b = parseInt(hex.slice(5, 7) || '0', 16);
      shadows.push(`0 4px ${style.shadowBlur || 8}px rgba(${r},${g},${b},${opacity})`);
    }

    // Outline using multi-angle radial text-shadow (prevents diagonal gaps and broken strokes)
    if (style.hasOutline && style.outlineWidth > 0) {
      const oColor = style.outlineColor || '#000000';
      const w = style.outlineWidth;
      
      // Generate 16 radial points in a full 360-degree circle for butter-smooth continuous outline
      for (let angle = 0; angle < 360; angle += 22.5) {
        const rad = (angle * Math.PI) / 180;
        const x = Number((Math.cos(rad) * w).toFixed(2));
        const y = Number((Math.sin(rad) * w).toFixed(2));
        shadows.push(`${x}px ${y}px 0 ${oColor}`);
      }
      
      // If stroke width is thick (>= 3px), add inner fill ring at half radius to ensure 100% solid opacity
      if (w >= 3) {
        const halfW = w / 2;
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const x = Number((Math.cos(rad) * halfW).toFixed(2));
          const y = Number((Math.sin(rad) * halfW).toFixed(2));
          shadows.push(`${x}px ${y}px 0 ${oColor}`);
        }
      }
    }

    return {
      fontFamily: `"${style.fontFamily}", sans-serif`,
      fontSize: `clamp(18px, 3.2vw, ${style.fontSize}px)`,
      color: style.textColor || '#FFFFFF',
      fontWeight: style.fontWeight === 'bold' || style.fontWeight === '700' ? 700 : 500,
      bottom: `${style.positionY}%`,
      left: `${style.positionX}%`,
      transform: 'translateX(-50%)',
      textShadow: shadows.length > 0 ? shadows.join(', ') : 'none',
      backgroundColor: style.hasBackground ? style.backgroundColor || 'rgba(0,0,0,0.65)' : 'transparent',
      padding: style.hasBackground ? '8px 18px' : '4px 8px',
      borderRadius: style.hasBackground ? '14px' : '0px',
    };
  }, [style]);

  // Aspect ratio wrapper styling
  const aspectClass = useMemo(() => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[340px] mx-auto';
      case '16:9':
        return 'aspect-[16/9] w-full';
      case '1:1':
        return 'aspect-square max-w-[420px] mx-auto';
      default:
        return 'aspect-auto w-full';
    }
  }, [aspectRatio]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl group ${className}`}
    >
      {/* Top Floating Toolbar (Aspect Ratio & Highlight Badge) */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-1 rounded-xl pointer-events-auto shadow-lg">
          <button
            type="button"
            onClick={() => setAspectRatio('auto')}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === 'auto'
                ? 'bg-orange-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="สัดส่วนวิดีโอตามไฟล์จริง (Auto)"
          >
            <Layers className="w-3 h-3 inline mr-1" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-orange-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวตั้ง 9:16 (TikTok, Reels, Shorts)"
          >
            <Smartphone className="w-3 h-3 inline mr-1" />
            9:16
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('16:9')}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-orange-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวนอน 16:9 (YouTube Widescreen)"
          >
            <Tv className="w-3 h-3 inline mr-1" />
            16:9
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('1:1')}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-orange-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="จัตุรัส 1:1 (Instagram Feed)"
          >
            <Square className="w-3 h-3 inline mr-1" />
            1:1
          </button>
        </div>

        {/* Word Highlight Interactive Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStyle({ enableWordHighlight: !style.enableWordHighlight });
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg pointer-events-auto ${
            style.enableWordHighlight
              ? 'bg-amber-500/25 border border-amber-500/60 text-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-500/30'
              : 'bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
          title="คลิกเพื่อ เปิด/ปิด การไฮไลท์คำตามเสียงพูดแบบ Real-time"
        >
          <Sparkles className={`w-3.5 h-3.5 ${style.enableWordHighlight ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span>Word Highlight: {style.enableWordHighlight ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Video / Audio Display Area */}
      <div
        onClick={togglePlay}
        className={`relative flex items-center justify-center bg-black cursor-pointer overflow-hidden min-h-[280px] max-h-[520px] ${aspectClass}`}
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

            {/* Audio File Visualizer Overlay */}
            {isAudioFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-2xl">
                  <Music className={`w-10 h-10 ${isPlaying ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{file?.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1">ไฟล์เสียง (Audio Mode) กำลังเล่นพร้อม Subtitle</p>
                </div>
                {/* Equalizer Wave simulation */}
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

            {/* Subtitle Overlay Display Layer */}
            {activeCaption && (
              <div
                style={subtitleOverlayStyle}
                className="absolute z-20 text-center max-w-[92%] pointer-events-none select-none transition-all duration-75"
              >
                <p className="leading-snug inline text-center" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {style.enableWordHighlight && activeCaption.words && activeCaption.words.length > 0 ? (
                    /* Word-level Highlight with 100% natural inline rendering (No Flexbox, No Blur) */
                    activeCaption.words.map((w: CaptionWord, idx: number) => {
                      const isWordActive =
                        w.start <= currentTime && currentTime <= w.end + 0.08;

                      return (
                        <span
                          key={idx}
                          className="transition-colors duration-75 inline"
                          style={{
                            color: isWordActive ? style.highlightColor || '#FACC15' : style.textColor || '#FFFFFF',
                            fontWeight: isWordActive
                              ? 800
                              : style.fontWeight === 'bold' || style.fontWeight === '700'
                              ? 700
                              : style.fontWeight === '800'
                              ? 800
                              : 500,
                          }}
                        >
                          {w.word}
                        </span>
                      );
                    })
                  ) : (
                    /* Whole Caption Text Rendering */
                    <span>{activeCaption.text}</span>
                  )}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-8 space-y-2">
            <Smartphone className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">ไม่มีวิดีโอสำหรับการแสดงผล</p>
          </div>
        )}

        {/* Big Center Play/Pause indicator on hover/pause */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
            <div className="w-16 h-16 rounded-full bg-orange-500/90 text-zinc-950 flex items-center justify-center shadow-2xl transform scale-100 hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-1 fill-zinc-950" />
            </div>
          </div>
        )}
      </div>

      {/* Scrubber Progress Bar */}
      <div
        ref={progressBarRef}
        onClick={handleScrubberClick}
        onMouseMove={handleScrubberMouseMove}
        onMouseLeave={() => setHoverTime(null)}
        className="relative w-full h-3 bg-zinc-900 hover:h-4 transition-all cursor-pointer group/bar flex items-center"
      >
        {/* Track background */}
        <div className="w-full h-1.5 bg-zinc-800 group-hover/bar:h-2 transition-all relative overflow-hidden">
          {/* Played Progress */}
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Subtitle Cue Markers on Timeline */}
        {duration > 0 &&
          captions.map((cue) => {
            const leftPct = (cue.start / duration) * 100;
            const widthPct = Math.max(0.5, ((cue.end - cue.start) / duration) * 100);
            return (
              <span
                key={cue.id}
                className="absolute top-0 bottom-0 bg-white/25 pointer-events-none rounded-sm"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={cue.text}
              />
            );
          })}

        {/* Hover Scrubbing Bubble */}
        {hoverTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-orange-400 pointer-events-none shadow-lg z-40"
            style={{
              left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Custom Video Controls Bar */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between gap-3 text-xs text-zinc-300">
        {/* Left: Play/Pause, Rewind, Forward, Time */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-orange-500/20"
            title={isPlaying ? 'หยุดชั่วคราว (Spacebar)' : 'เล่น (Spacebar)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 ml-0.5 fill-zinc-950" />}
          </button>

          <button
            type="button"
            onClick={() => videoRef.current && seekTo(videoRef.current.currentTime - 5)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="ย้อนกลับ 5 วินาที"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => videoRef.current && seekTo(videoRef.current.currentTime + 5)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="ข้ามไปข้างหน้า 5 วินาที"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time Display */}
          <div className="font-mono text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1">
            <span className="text-orange-400 font-semibold">{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Speed selector, Volume, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-zinc-800 text-orange-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="เต็มจอ (Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
