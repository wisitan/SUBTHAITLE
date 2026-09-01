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
import { useCaptionSync } from '@/hooks/use-caption-sync';
import { TikTokSafeZone } from './tiktok-safe-zone';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(mediaDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const { activeCaption, formatTime } = useCaptionSync(videoRef, isPlaying);

  // Calculate the single active word index (Guarantees only ONE word is highlighted at any time)
  const activeWordIndex = useMemo(() => {
    if (!activeCaption?.words || activeCaption.words.length === 0) return -1;
    const strictIdx = activeCaption.words.findIndex(
      (w) => w.start <= currentTime && currentTime < w.end
    );
    if (strictIdx !== -1) return strictIdx;

    return activeCaption.words.findIndex(
      (w) => w.start <= currentTime && currentTime <= w.end + 0.08
    );
  }, [activeCaption, currentTime]);

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

  // Synchronize external seek requests from store (e.g. caption table play cue / row click)
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

  // Calculate buffer margin needed around each word to prevent overlapping when scale transforms
  const wordBufferPx = useMemo(() => {
    const baseDim = Math.min(visualBounds.w, visualBounds.h);
    const domScale = (baseDim || 360) / 360;
    const scaledFontSize = (style.fontSize || 24) * domScale;
    const highlightScale = style.highlightScale ?? 1.15;
    if (!style.enableWordHighlight || highlightScale <= 1) return 0;
    return ((highlightScale - 1) / 2) * scaledFontSize;
  }, [visualBounds, style]);

  // Build dynamic text-shadow & outline CSS with 100% WYSIWYG Proportional Scaling
  const { subtitleOverlayStyle, shadowsCss } = useMemo(() => {
    // Proportional scale factor matching Canvas Render (base width: 360px for 9:16)
    // We scale against the EXACT visual dimensions of the object-contain area.
    // Use the shortest dimension to ensure consistent text size across landscape and portrait modes.
    const baseDim = Math.min(visualBounds.w, visualBounds.h);
    const scale = (baseDim || 360) / 360;
    
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
    const computedShadows = shadows.length > 0 ? shadows.join(', ') : 'none';

    const overlayStyle: React.CSSProperties = {
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
      backgroundColor: bgColor,
      padding: `${scaledBoxPaddingY}px ${scaledBoxPaddingX}px`,
      borderRadius: `${scaledBorderRadius}px`,
      boxSizing: 'border-box' as const,
    };

    return {
      subtitleOverlayStyle: overlayStyle,
      shadowsCss: computedShadows,
    };
  }, [style, visualBounds]);

  // Aspect ratio wrapper styling - Full-width and natural proportions without dark sidebars
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
      {/* Top Studio Controls Bar - Compact Single-Line Row Above Video Preview */}
      <div className="w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-[#12121c] border-b border-zinc-800/80 shrink-0 select-none">
        {/* Left: Compact Aspect Ratio Switcher */}
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

        {/* Right: Quick Toggles side-by-side in single line */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* TikTok Safe Zone Toggle (Only active & shown when 9:16 is active) */}
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
              title="เปิด/ปิด TikTok Safe Zone เพื่อดูพื้นที่ปลอดภัยไม่ให้ปุ่ม TikTok บังซับ"
            >
              <Smartphone className={`w-3 h-3 ${showTikTokSafeZone ? 'text-orange-400' : 'text-zinc-400'}`} />
              <span>Safe Zone: {showTikTokSafeZone ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Word Highlight Toggle */}
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
                  {style.enableWordHighlight && activeCaption.words && activeCaption.words.length > 0 ? (
                    /* Sticker Pop-up Architecture: Layer 1 (Base Outlines) + Layer 2 (Foreground Words & Pop-up Active Word) */
                    <div className="relative w-full">
                      {/* Layer 1: Continuous Background Outline & Shadow (Base Layer) */}
                      <p
                        className="w-full inline-block m-0 p-0 select-none"
                        style={{
                          textAlign: style.textAlign || 'center',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          letterSpacing: `${style.letterSpacing ?? 0}px`,
                          lineHeight: style.lineHeight ?? 1.4,
                          color: 'transparent',
                          textShadow: shadowsCss,
                        }}
                        aria-hidden="true"
                      >
                        {activeCaption.words.map((w: CaptionWord, idx: number) => {
                          const isWordActive = idx === activeWordIndex;

                          let prefixSpace = '';
                          if (idx > 0) {
                            const prevW = activeCaption.words![idx - 1];
                            const testJoin = formatCaptionWordsText([prevW, w]);
                            if (testJoin.includes(' ')) {
                              prefixSpace = ' ';
                            }
                          }

                          const scaleMultiplier = style.enableWordHighlight ? (style.highlightScale ?? 1.15) : 1;
                          const isScaled = isWordActive && scaleMultiplier > 1;

                          return (
                            <React.Fragment key={idx}>
                              {prefixSpace && <span>{prefixSpace}</span>}
                              <span
                                className="inline-block origin-center transition-all duration-150 ease-out"
                                style={{
                                  fontWeight: isWordActive
                                    ? 800
                                    : style.fontWeight === 'bold' || style.fontWeight === '700'
                                    ? 700
                                    : style.fontWeight === '800'
                                    ? 800
                                    : 500,
                                  transform: isScaled ? `scale(${scaleMultiplier})` : 'scale(1)',
                                  marginLeft: `${wordBufferPx}px`,
                                  marginRight: `${wordBufferPx}px`,
                                }}
                              >
                                {w.word}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </p>

                      {/* Layer 2: Foreground Words (Active word with z-20 & crisp textShadow stickers over inactive z-10 words) */}
                      <p
                        className="w-full inline-block m-0 p-0 absolute inset-0 select-none"
                        style={{
                          textAlign: style.textAlign || 'center',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          letterSpacing: `${style.letterSpacing ?? 0}px`,
                          lineHeight: style.lineHeight ?? 1.4,
                          textShadow: 'none',
                        }}
                      >
                        {activeCaption.words.map((w: CaptionWord, idx: number) => {
                          const isWordActive = idx === activeWordIndex;

                          let prefixSpace = '';
                          if (idx > 0) {
                            const prevW = activeCaption.words![idx - 1];
                            const testJoin = formatCaptionWordsText([prevW, w]);
                            if (testJoin.includes(' ')) {
                              prefixSpace = ' ';
                            }
                          }

                          const scaleMultiplier = style.enableWordHighlight ? (style.highlightScale ?? 1.15) : 1;
                          const isScaled = isWordActive && scaleMultiplier > 1;

                          return (
                            <React.Fragment key={idx}>
                              {prefixSpace && <span>{prefixSpace}</span>}
                              <span
                                className={`inline-block origin-center transition-all duration-150 ease-out ${
                                  isWordActive ? 'relative z-20' : 'relative z-10'
                                }`}
                                style={{
                                  color: isWordActive ? style.highlightColor || '#FACC15' : style.textColor || '#FFFFFF',
                                  fontWeight: isWordActive
                                    ? 800
                                    : style.fontWeight === 'bold' || style.fontWeight === '700'
                                    ? 700
                                    : style.fontWeight === '800'
                                    ? 800
                                    : 500,
                                  transform: isScaled ? `scale(${scaleMultiplier})` : 'scale(1)',
                                  marginLeft: `${wordBufferPx}px`,
                                  marginRight: `${wordBufferPx}px`,
                                  // The active pop-up word carries its own crisp shadow/outline sticker over everything!
                                  textShadow: isWordActive && shadowsCss !== 'none' ? shadowsCss : 'none',
                                }}
                              >
                                {w.word}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </p>
                    </div>
                  ) : (
                    /* Whole Caption Text Rendering (Single clean layer) */
                    <p
                      className="w-full inline-block m-0 p-0"
                      style={{
                        textAlign: style.textAlign || 'center',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        letterSpacing: `${style.letterSpacing ?? 0}px`,
                        lineHeight: style.lineHeight ?? 1.4,
                        color: style.textColor || '#FFFFFF',
                        textShadow: shadowsCss,
                      }}
                    >
                      <span>{activeCaption.text}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* TikTok Safe Zone Overlay - Strictly confined to actual video frame (never in black bars) */}
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
