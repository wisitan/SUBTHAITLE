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
} from 'lucide-react';
import { loadGoogleFont } from '@/lib/fonts';
import { formatCaptionWordsText } from '@/lib/thai-text';

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
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  
  // Track the exact pixel dimensions of the video container for perfect WYSIWYG scaling
  const [containerSize, setContainerSize] = useState({ w: 360, h: 640 });

  const videoDisplayRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen change events (including Esc key)
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

  // Measure actual rendered canvas size dynamically
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

  // Helper to convert hex + opacity percentage (0-100) to rgba
  const hexToRgba = (hex: string, opacityPercent: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.slice(0, 2) || '0', 16);
    const g = parseInt(cleanHex.slice(2, 4) || '0', 16);
    const b = parseInt(cleanHex.slice(4, 6) || '0', 16);
    const a = Math.max(0, Math.min(1, opacityPercent / 100)).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Calculate the exact visual dimensions of the object-contain video area
  const visualBounds = useMemo(() => {
    let targetRatio = 9 / 16;
    if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === '1:1') targetRatio = 1;

    const containerRatio = containerSize.w / containerSize.h;
    let actualWidth = containerSize.w;
    let actualHeight = containerSize.h;

    // object-contain logic: fit within bounds while preserving target aspect ratio
    if (containerRatio > targetRatio) {
      // Container is wider than the target aspect ratio (pillarboxing)
      actualWidth = containerSize.h * targetRatio;
    } else {
      // Container is taller than the target aspect ratio (letterboxing)
      actualHeight = containerSize.w / targetRatio;
    }

    return { w: actualWidth, h: actualHeight };
  }, [containerSize, aspectRatio]);

  // Build dynamic text-shadow & outline CSS with 100% WYSIWYG Proportional Scaling
  const subtitleOverlayStyle: React.CSSProperties = useMemo(() => {
    // Proportional scale factor matching Canvas Render (base width: 360px for 9:16)
    // We scale against the EXACT visual width of the object-contain area.
    const scale = (visualBounds.w || 360) / 360;
    
    const scaledFontSize = (style.fontSize || 24) * scale;
    const scaledLetterSpacing = (style.letterSpacing ?? 0) * scale;
    const scaledOutline = (style.outlineWidth ?? 0) * scale;
    const scaledBoxPaddingX = (style.hasBackground ? 18 : 8) * scale;
    const scaledBoxPaddingY = (style.hasBackground ? 10 : 4) * scale;
    const scaledBorderRadius = (style.hasBackground ? 14 : 0) * scale;
    const scaledShadowBlur = (style.shadowBlur || 8) * scale;

    const shadows: string[] = [];

    // Drop shadow
    if (style.hasShadow) {
      const hex = style.shadowColor || '#000000';
      const opacity = style.shadowOpacity ?? 0.8;
      const r = parseInt(hex.slice(1, 3) || '0', 16);
      const g = parseInt(hex.slice(3, 5) || '0', 16);
      const b = parseInt(hex.slice(5, 7) || '0', 16);
      shadows.push(`0 ${4 * scale}px ${scaledShadowBlur}px rgba(${r},${g},${b},${opacity})`);
    }

    // Outline using multi-angle radial text-shadow (prevents diagonal gaps and broken strokes)
    if (style.hasOutline && scaledOutline > 0) {
      const oColor = style.outlineColor || '#000000';
      
      // Generate 16 radial points in a full 360-degree circle for butter-smooth continuous outline
      for (let angle = 0; angle < 360; angle += 22.5) {
        const rad = (angle * Math.PI) / 180;
        const x = Number((Math.cos(rad) * scaledOutline).toFixed(2));
        const y = Number((Math.sin(rad) * scaledOutline).toFixed(2));
        shadows.push(`${x}px ${y}px 0 ${oColor}`);
      }
      
      // If stroke width is thick (>= 3px), add inner fill ring at half radius to ensure 100% solid opacity
      if (scaledOutline >= 3) {
        const halfW = scaledOutline / 2;
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const x = Number((Math.cos(rad) * halfW).toFixed(2));
          const y = Number((Math.sin(rad) * halfW).toFixed(2));
          shadows.push(`${x}px ${y}px 0 ${oColor}`);
        }
      }
    }

    const bgColor = style.hasBackground
      ? hexToRgba(style.backgroundColor || '#000000', style.backgroundOpacity ?? 70)
      : 'transparent';

    const maxWidthPct = style.maxWidth ?? 92;
    const textAlign = style.textAlign || 'center';

    return {
      fontFamily: `"${style.fontFamily}", sans-serif`,
      fontSize: `${scaledFontSize}px`,
      color: style.textColor || '#FFFFFF',
      fontWeight:
        style.fontWeight === 'bold' || style.fontWeight === '700'
          ? 700
          : style.fontWeight === '800'
          ? 800
          : 500,
      letterSpacing: `${scaledLetterSpacing}px`,
      lineHeight: style.lineHeight ?? 1.4,
      textAlign,
      width: `${maxWidthPct}%`,
      maxWidth: `${maxWidthPct}%`,
      bottom: `${style.positionY}%`,
      left: `${style.positionX}%`,
      transform: 'translateX(-50%)',
      textShadow: shadows.length > 0 ? shadows.join(', ') : 'none',
      backgroundColor: bgColor,
      padding: `${scaledBoxPaddingY}px ${scaledBoxPaddingX}px`,
      borderRadius: `${scaledBorderRadius}px`,
      boxSizing: 'border-box' as const,
    };
  }, [style, visualBounds]);

  // Aspect ratio wrapper styling - Full-width and natural proportions without dark sidebars
  const aspectClass = useMemo(() => {
    if (isFullscreen) {
      return 'w-full h-full flex-1 max-h-none max-w-none aspect-auto';
    }
    switch (aspectRatio) {
      case '9:16':
        return 'w-full aspect-[9/16] mx-auto';
      case '16:9':
        return 'w-full aspect-[16/9] mx-auto';
      case '1:1':
        return 'w-full aspect-square mx-auto';
      default:
        return 'w-full aspect-[9/16] mx-auto';
    }
  }, [aspectRatio, isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-zinc-950 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl group ${className}`}
    >
      {/* Top Floating Toolbar (Aspect Ratio & Highlight Badge) */}
      <div className="absolute top-3 left-2.5 right-2.5 sm:left-3 sm:right-3 z-30 flex items-center justify-between pointer-events-none gap-2">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-1 rounded-xl pointer-events-auto shadow-lg">
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวตั้ง 9:16 (TikTok, Reels, Shorts)"
          >
            <Smartphone className="w-3.5 h-3.5 inline sm:mr-1" />
            <span className="hidden sm:inline">9:16</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('16:9')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="แนวนอน 16:9 (YouTube Widescreen)"
          >
            <Tv className="w-3.5 h-3.5 inline sm:mr-1" />
            <span className="hidden sm:inline">16:9</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('1:1')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="จัตุรัส 1:1 (Square)"
          >
            <Square className="w-3.5 h-3.5 inline sm:mr-1" />
            <span className="hidden sm:inline">1:1</span>
          </button>
        </div>

        {/* Word Highlight Interactive Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStyle({ enableWordHighlight: !style.enableWordHighlight });
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg pointer-events-auto shrink-0 ${
            style.enableWordHighlight
              ? 'bg-amber-500/25 border border-amber-500/60 text-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-500/30'
              : 'bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
          }`}
          title="คลิกเพื่อ เปิด/ปิด การไฮไลท์คำตามเสียงพูดแบบ Real-time"
        >
          <Sparkles className={`w-3.5 h-3.5 ${style.enableWordHighlight ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span><span className="hidden sm:inline">Word </span>Highlight: {style.enableWordHighlight ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Video / Audio Display Area */}
      <div
        ref={videoDisplayRef}
        onClick={togglePlay}
        className={`relative flex items-center justify-center bg-black cursor-pointer overflow-hidden min-h-[280px] ${aspectClass}`}
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

            {/* Subtitle Overlay Display Layer - Confined to exact visual bounds of the object-contain video */}
            {activeCaption && (
              <div 
                className="absolute inset-0 m-auto pointer-events-none"
                style={{
                  width: `${visualBounds.w}px`,
                  height: `${visualBounds.h}px`,
                }}
              >
                <div
                  style={subtitleOverlayStyle}
                  className="absolute z-20 pointer-events-none select-none transition-all duration-75"
                >
                <p
                  className="w-full inline-block m-0 p-0"
                  style={{
                    textAlign: style.textAlign || 'center',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    letterSpacing: `${style.letterSpacing ?? 0}px`,
                    lineHeight: style.lineHeight ?? 1.4,
                  }}
                >
                  {style.enableWordHighlight && activeCaption.words && activeCaption.words.length > 0 ? (
                    /* Word-level Highlight with 100% natural inline rendering (No Flexbox, No Blur) */
                    activeCaption.words.map((w: CaptionWord, idx: number) => {
                      const isWordActive =
                        w.start <= currentTime && currentTime <= w.end + 0.08;

                      // Smart Spacing Logic: Check if we need to prepend a space before this word
                      let prefixSpace = '';
                      if (idx > 0) {
                        const prevW = activeCaption.words![idx - 1];
                        const testJoin = formatCaptionWordsText([prevW, w]);
                        // If formatCaptionWordsText decided to insert a space between them, we render it
                        if (testJoin.includes(' ')) {
                          prefixSpace = ' ';
                        }
                      }

                      return (
                        <React.Fragment key={idx}>
                          {prefixSpace && <span>{prefixSpace}</span>}
                          <span
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
                        </React.Fragment>
                      );
                    })
                  ) : (
                    /* Whole Caption Text Rendering */
                    <span>{activeCaption.text}</span>
                  )}
                </p>
                </div>
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
            className="absolute -top-7 -translate-x-1/2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-xs font-mono text-orange-400 pointer-events-none shadow-lg z-40"
            style={{
              left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Custom Video Controls Bar */}
      <div className="p-2.5 sm:p-3 bg-zinc-900 border-t border-zinc-700 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-sm text-zinc-300">
        {/* Left: Play/Pause, Rewind, Forward, Time */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-orange-500/20 shrink-0"
            title={isPlaying ? 'หยุดชั่วคราว (Spacebar)' : 'เล่น (Spacebar)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 ml-0.5 fill-zinc-950" />}
          </button>

          <button
            type="button"
            onClick={() => videoRef.current && seekTo(videoRef.current.currentTime - 5)}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="ย้อนกลับ 5 วินาที"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={() => videoRef.current && seekTo(videoRef.current.currentTime + 5)}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="ข้ามไปข้างหน้า 5 วินาที"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Time Display */}
          <div className="font-mono text-xs sm:text-sm text-zinc-300 flex items-center gap-1 font-medium whitespace-nowrap">
            <span className="text-orange-400 font-bold">{formatTime(currentTime)}</span>
            <span className="text-zinc-500">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Speed selector, Volume, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
            {[1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-zinc-800 text-orange-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
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
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="เต็มจอ (Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
