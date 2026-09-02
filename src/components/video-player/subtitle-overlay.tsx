'use client';

import React, { useMemo } from 'react';
import { CaptionItem, CaptionStyle, CaptionWord } from '@/lib/store';
import { formatCaptionWordsText, expandWordsToFineGrained, getTypewriterSlice, distributeTextToWords } from '@/lib/thai-text';

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
  // Fine-grained timed words with compound segment expansion (splits "จากTableDescription" -> ["จาก", "Table", "Description"])
  const displayWords = useMemo(() => {
    if (!activeCaption) return [];
    if (activeCaption.words && activeCaption.words.length > 0) {
      return expandWordsToFineGrained(activeCaption.words);
    }
    return distributeTextToWords(activeCaption.text, activeCaption.start, activeCaption.end);
  }, [activeCaption]);

  // Calculate the single active word index (Guarantees STRICTLY only ONE fine-grained word is highlighted at any time)
  const activeWordIndex = useMemo(() => {
    if (displayWords.length === 0) return -1;
    
    // 1. Strict non-overlapping match: start <= time < end
    const strictIdx = displayWords.findIndex(
      (w) => w.start <= currentTime && currentTime < w.end
    );
    if (strictIdx !== -1) return strictIdx;

    // 2. Tolerance match (for trailing 50ms)
    return displayWords.findIndex(
      (w) => w.start <= currentTime && currentTime <= w.end + 0.05
    );
  }, [displayWords, currentTime]);

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

  // Dynamic micro-gap between adjacent words and sticker pill styling
  const { microGapPx, activeWordShadowCss, stickerStyles } = useMemo(() => {
    const baseDim = Math.min(visualBounds.w, visualBounds.h);
    const domScale = (baseDim || 360) / 360;
    const gap = style.enableWordHighlight ? Math.max(1.5, 2 * domScale) : 0;

    const highlightColor = style.highlightColor || '#FACC15';
    const glow1 = `0 0 ${8 * domScale}px ${hexToRgba(highlightColor, 75)}`;
    const glow2 = `0 0 ${18 * domScale}px ${hexToRgba(highlightColor, 40)}`;
    const activeGlow = `${glow1}, ${glow2}`;

    const combinedShadows = shadowsCss !== 'none'
      ? `${shadowsCss}, ${activeGlow}`
      : activeGlow;

    // Sticker mode parameters with generous spacing to guarantee zero background overlap
    const pillPadX = Math.round(7 * domScale);
    const pillPadY = Math.round(3 * domScale);
    const pillRadius = Math.round(6 * domScale);
    const pillMargin = Math.round(3 * domScale);

    return {
      microGapPx: gap,
      activeWordShadowCss: combinedShadows,
      stickerStyles: {
        pillPadX,
        pillPadY,
        pillRadius,
        pillMargin,
      },
    };
  }, [visualBounds, style.enableWordHighlight, style.highlightColor, shadowsCss]);

  if (!activeCaption) return null;

  const animMode = style.wordAnimationMode || 'classic';
  const isStickerMode = animMode === 'sticker';

  const isWordVisible = (idx: number): boolean => {
    if (animMode === 'classic') return true;
    if (activeWordIndex !== -1) {
      return idx <= activeWordIndex;
    }
    if (displayWords.length === 0) return false;
    if (currentTime < displayWords[0].start) return false;
    if (currentTime >= displayWords[displayWords.length - 1].end) return true;
    for (let i = displayWords.length - 1; i >= 0; i--) {
      if (currentTime >= displayWords[i].end) {
        return idx <= i;
      }
    }
    return false;
  };

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
        {style.enableWordHighlight && displayWords.length > 0 ? (
          /* Architecture: Layer 1 (Base Outlines) + Layer 2 (Foreground Words & Pop-up Active Word) */
          <div className="relative w-full">
            {/* Layer 1: Continuous Background Outline & Shadow (Base Layer - skipped in sticker mode) */}
            {!isStickerMode && (
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
                {displayWords.map((w: CaptionWord, idx: number) => {
                  const isWordActive = idx === activeWordIndex;
                  const isVisible = isWordVisible(idx);

                  let prefixSpace = '';
                  if (idx > 0) {
                    const prevW = displayWords[idx - 1];
                    const testJoin = formatCaptionWordsText([prevW, w]);
                    if (testJoin.includes(' ')) {
                      prefixSpace = ' ';
                    }
                  }

                  const isLastWord = idx === displayWords.length - 1;
                  const nextHasSpace = !isLastWord && formatCaptionWordsText([w, displayWords[idx + 1]]).includes(' ');
                  const gapRight = (!isLastWord && !nextHasSpace) ? microGapPx : 0;

                  const scaleMultiplier = style.enableWordHighlight ? (style.highlightScale ?? 1.15) : 1;
                  const isScaled = isWordActive && scaleMultiplier > 1 && animMode !== 'typewriter';

                  if (animMode === 'typewriter' && isWordActive) {
                    const slice = getTypewriterSlice(w.word, w.start, w.end, currentTime);
                    const remainder = w.word.slice(slice.visibleText.length);

                    return (
                      <React.Fragment key={`${activeCaption.id || ''}-l1-${idx}`}>
                        {prefixSpace && (
                          <span
                            style={{
                              opacity: isVisible ? 1 : 0,
                              visibility: isVisible ? 'visible' : 'hidden',
                            }}
                          >
                            {prefixSpace}
                          </span>
                        )}
                        <span
                          className="inline-block origin-center font-extrabold"
                          style={{
                            marginRight: gapRight > 0 ? `${gapRight}px` : undefined,
                          }}
                        >
                          <span>{slice.visibleText}</span>
                          {remainder && (
                            <span className="opacity-0 select-none pointer-events-none" aria-hidden="true">
                              {remainder}
                            </span>
                          )}
                        </span>
                      </React.Fragment>
                    );
                  }

                  return (
                    <React.Fragment key={`${activeCaption.id || ''}-l1-${idx}`}>
                      {prefixSpace && (
                        <span
                          style={{
                            opacity: isVisible ? 1 : 0,
                            visibility: isVisible ? 'visible' : 'hidden',
                          }}
                        >
                          {prefixSpace}
                        </span>
                      )}
                      <span
                        className="inline-block origin-center transition-[transform] duration-150 ease-out"
                        style={{
                          opacity: isVisible ? 1 : 0,
                          visibility: isVisible ? 'visible' : 'hidden',
                          fontWeight: isWordActive
                            ? 800
                            : style.fontWeight === 'bold' || style.fontWeight === '700'
                            ? 700
                            : style.fontWeight === '800'
                            ? 800
                            : 500,
                          transform: isScaled ? `scale(${scaleMultiplier})` : 'scale(1)',
                          marginLeft: isScaled ? `${wordBufferPx}px` : undefined,
                          marginRight: isScaled ? `${wordBufferPx + gapRight}px` : (gapRight > 0 ? `${gapRight}px` : undefined),
                        }}
                      >
                        {w.word}
                      </span>
                    </React.Fragment>
                  );
                })}
              </p>
            )}

            {/* Layer 2: Foreground Words */}
            <p
              className={`w-full inline-block m-0 p-0 select-none ${isStickerMode ? '' : 'absolute inset-0'}`}
              style={{
                textAlign: style.textAlign || 'center',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                letterSpacing: `${style.letterSpacing ?? 0}px`,
                lineHeight: style.lineHeight ?? (isStickerMode ? 1.7 : 1.4),
                textShadow: isStickerMode ? 'none' : 'none',
              }}
            >
              {displayWords.map((w: CaptionWord, idx: number) => {
                const isWordActive = idx === activeWordIndex;
                const isVisible = isWordVisible(idx);

                let prefixSpace = '';
                if (idx > 0) {
                  const prevW = displayWords[idx - 1];
                  const testJoin = formatCaptionWordsText([prevW, w]);
                  if (testJoin.includes(' ')) {
                    prefixSpace = ' ';
                  }
                }

                const isLastWord = idx === displayWords.length - 1;
                const nextHasSpace = !isLastWord && formatCaptionWordsText([w, displayWords[idx + 1]]).includes(' ');
                const gapRight = (!isLastWord && !nextHasSpace) ? microGapPx : 0;

                const scaleMultiplier = style.enableWordHighlight ? (style.highlightScale ?? 1.15) : 1;
                const isScaled = isWordActive && scaleMultiplier > 1 && animMode !== 'typewriter';

                if (isStickerMode) {
                  return (
                    <React.Fragment key={`${activeCaption.id || ''}-l2-${idx}`}>
                      {prefixSpace && (
                        <span
                          style={{
                            opacity: isVisible ? 1 : 0,
                            visibility: isVisible ? 'visible' : 'hidden',
                          }}
                        >
                          {prefixSpace}
                        </span>
                      )}
                      <span
                        className={`inline-block origin-center transition-[transform] duration-120 ease-out ${
                          isWordActive ? 'relative z-30' : 'relative z-10'
                        }`}
                        style={{
                          opacity: isVisible ? 1 : 0,
                          visibility: isVisible ? 'visible' : 'hidden',
                          backgroundColor: isWordActive
                            ? (style.highlightColor || '#FACC15')
                            : 'transparent',
                          color: isWordActive
                            ? '#121216'
                            : (style.textColor || '#FFFFFF'),
                          fontWeight: isWordActive
                            ? 800
                            : (style.fontWeight === 'bold' || style.fontWeight === '700'
                            ? 700
                            : style.fontWeight === '800'
                            ? 800
                            : 500),
                          padding: isWordActive
                            ? `${stickerStyles.pillPadY}px ${stickerStyles.pillPadX}px`
                            : '0',
                          borderRadius: isWordActive
                            ? `${stickerStyles.pillRadius}px`
                            : '0',
                          margin: isWordActive
                            ? `0 ${wordBufferPx + 3}px`
                            : undefined,
                          marginRight: !isWordActive && gapRight > 0
                            ? `${gapRight}px`
                            : undefined,
                          transform: isWordActive && isScaled
                            ? `scale(${scaleMultiplier})`
                            : 'scale(1)',
                          border: isWordActive
                            ? '1px solid rgba(255, 255, 255, 0.7)'
                            : 'none',
                          boxShadow: isWordActive
                            ? `0 0 14px ${hexToRgba(style.highlightColor || '#FACC15', 75)}, 0 4px 10px rgba(0,0,0,0.5)`
                            : 'none',
                          textShadow: !isWordActive && shadowsCss !== 'none'
                            ? shadowsCss
                            : 'none',
                        }}
                      >
                        {w.word}
                      </span>
                    </React.Fragment>
                  );
                }

                if (animMode === 'typewriter' && isWordActive) {
                  const slice = getTypewriterSlice(w.word, w.start, w.end, currentTime);
                  const remainder = w.word.slice(slice.visibleText.length);
                  const isCurrentlyTyping = slice.isTyping && !slice.isComplete;

                  return (
                    <React.Fragment key={`${activeCaption.id || ''}-l2-${idx}`}>
                      {prefixSpace && (
                        <span
                          style={{
                            opacity: isVisible ? 1 : 0,
                            visibility: isVisible ? 'visible' : 'hidden',
                          }}
                        >
                          {prefixSpace}
                        </span>
                      )}
                      <span
                        className="relative z-20 inline-block origin-center font-extrabold"
                        style={{
                          color: style.highlightColor || '#FACC15',
                          textShadow: activeWordShadowCss,
                          marginRight: gapRight > 0 ? `${gapRight}px` : undefined,
                        }}
                      >
                        <span>{slice.visibleText}</span>
                        {/* Blinking cursor positioned naturally */}
                        <span
                          className={`inline-block font-mono font-bold ${
                            isCurrentlyTyping ? 'animate-pulse text-orange-400' : 'text-amber-300'
                          }`}
                          style={{ width: '0.45em', marginLeft: '0.05em' }}
                        >
                          |
                        </span>
                        {/* Ghost untyped remainder to lock paragraph width & line wrap perfectly */}
                        {remainder && (
                          <span className="opacity-0 select-none pointer-events-none" aria-hidden="true">
                            {remainder}
                          </span>
                        )}
                      </span>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={`${activeCaption.id || ''}-l2-${idx}`}>
                    {prefixSpace && (
                      <span
                        style={{
                          opacity: isVisible ? 1 : 0,
                          visibility: isVisible ? 'visible' : 'hidden',
                        }}
                      >
                        {prefixSpace}
                      </span>
                    )}
                    <span
                      className={`inline-block origin-center transition-[transform] duration-120 ease-out ${
                        isWordActive ? 'relative z-20' : 'relative z-10'
                      }`}
                      style={{
                        opacity: isVisible ? 1 : 0,
                        visibility: isVisible ? 'visible' : 'hidden',
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
                        marginRight: isScaled ? `${wordBufferPx + gapRight}px` : (gapRight > 0 ? `${gapRight}px` : undefined),
                        textShadow: isWordActive ? activeWordShadowCss : (shadowsCss !== 'none' ? shadowsCss : 'none'),
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
