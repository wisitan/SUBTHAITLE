'use client';

import React, { useMemo } from 'react';
import { CaptionItem, CaptionStyle, CaptionWord } from '@/lib/store';
import { formatCaptionWordsText } from '@/lib/thai-text';

interface SubtitleOverlayProps {
  activeCaption: CaptionItem | null;
  currentTime: number;
  style: CaptionStyle;
  visualBounds: { w: number; h: number };
}

// Helper to convert hex + opacity percentage (0-100) to rgba
function hexToRgba(hex: string, opacityPercent: number) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2) || '0', 16);
  const g = parseInt(cleanHex.slice(2, 4) || '0', 16);
  const b = parseInt(cleanHex.slice(4, 6) || '0', 16);
  const a = Math.max(0, Math.min(1, opacityPercent / 100)).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function SubtitleOverlay({
  activeCaption,
  currentTime,
  style,
  visualBounds,
}: SubtitleOverlayProps) {
  // Calculate the single active word index (Guarantees STRICTLY only ONE word is highlighted at any time)
  const activeWordIndex = useMemo(() => {
    if (!activeCaption?.words || activeCaption.words.length === 0) return -1;
    
    // 1. Strict non-overlapping match: start <= time < end
    const strictIdx = activeCaption.words.findIndex(
      (w) => w.start <= currentTime && currentTime < w.end
    );
    if (strictIdx !== -1) return strictIdx;

    // 2. Tolerance match (for trailing 50ms)
    return activeCaption.words.findIndex(
      (w) => w.start <= currentTime && currentTime <= w.end + 0.05
    );
  }, [activeCaption, currentTime]);

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

    // Outline using multi-angle radial text-shadow
    if (style.hasOutline && scaledOutline > 0) {
      const oColor = style.outlineColor || '#000000';

      for (let angle = 0; angle < 360; angle += 22.5) {
        const rad = (angle * Math.PI) / 180;
        const x = Number((Math.cos(rad) * scaledOutline).toFixed(2));
        const y = Number((Math.sin(rad) * scaledOutline).toFixed(2));
        shadows.push(`${x}px ${y}px 0 ${oColor}`);
      }

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

  if (!activeCaption) return null;

  return (
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
                        marginLeft: isScaled ? `${wordBufferPx}px` : undefined,
                        marginRight: isScaled ? `${wordBufferPx}px` : undefined,
                      }}
                    >
                      {w.word}
                    </span>
                  </React.Fragment>
                );
              })}
            </p>

            {/* Layer 2: Foreground Words */}
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
                        marginLeft: isScaled ? `${wordBufferPx}px` : undefined,
                        marginRight: isScaled ? `${wordBufferPx}px` : undefined,
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
          /* Whole Caption Text Rendering */
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
  );
}
