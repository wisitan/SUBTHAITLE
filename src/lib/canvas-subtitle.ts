import { CaptionItem, CaptionStyle, CaptionWord } from './store';
import { formatCaptionWordsText, expandWordsToFineGrained } from './thai-text';

export interface RenderSequenceOptions {
  captions: CaptionItem[];
  style: CaptionStyle;
  videoWidth: number;
  videoHeight: number;
  videoDuration: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface SubtitleFrame {
  filename: string;
  data: Uint8Array;
  duration: number; // in seconds
}

export interface RenderSequenceResult {
  frames: SubtitleFrame[];
  concatFileContent: string;
}

// Convert Hex + opacity percentage to rgba string
export function hexToRgba(hex: string, opacityPercent: number = 100): string {
  if (!hex) return 'rgba(255,255,255,1)';
  const cleanHex = hex.replace('#', '').trim();
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(fullHex.slice(0, 2) || '0', 16);
  const g = parseInt(fullHex.slice(2, 4) || '0', 16);
  const b = parseInt(fullHex.slice(4, 6) || '0', 16);
  const a = Math.max(0, Math.min(1, opacityPercent / 100)).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Fallback for rounded rectangle in Canvas2D
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }
  // Manual bezier curve fallback
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Render a single frame with transparent background using Canvas 2D
 */
export async function renderSubtitleCanvas(
  caption: CaptionItem | null,
  activeWordIndex: number | null,
  style: CaptionStyle,
  width: number,
  height: number,
  sharedCanvas?: HTMLCanvasElement
): Promise<Uint8Array> {
  const canvas = sharedCanvas || document.createElement('canvas');
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Cannot get 2D context');

  // Reset/clear canvas buffer for clean draw
  ctx.clearRect(0, 0, width, height);

  // If no caption, return full-size transparent PNG (do NOT resize to 1x1, or FFmpeg concat demuxer will collapse entire stream resolution!)
  if (!caption) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Canvas toBlob failed');
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Ensure fonts are ready
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // Multiplier from preview player (~360px wide) to output video canvas (e.g. 1080px)
  // Use the shortest dimension to ensure a "20px" font is physically the same height 
  // in both 9:16 (1080x1920) and 16:9 (1920x1080) exports!
  const baseDimension = Math.min(width, height);
  const scale = baseDimension / 360;

  const fontSize = Math.round((style.fontSize || 24) * scale);
  const baseWeight =
    style.fontWeight === 'bold' || style.fontWeight === '700'
      ? '700'
      : style.fontWeight === '800'
      ? '800'
      : '500';

  const highlightScaleValue = style.highlightScale ?? 1.15;
  const scaleBufferPx = style.enableWordHighlight && highlightScaleValue > 1
    ? ((highlightScaleValue - 1) / 2) * fontSize
    : 0;

  const fontName = style.fontFamily || 'Noto Sans Thai';
  ctx.font = `${baseWeight} ${fontSize}px "${fontName}", sans-serif`;
  ctx.textBaseline = 'middle';

  const letterSpacing = (style.letterSpacing ?? 0) * scale;
  if ('letterSpacing' in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacing}px`;
  }

  const lineHeight = fontSize * (style.lineHeight ?? 1.4);
  const maxWidth = (width * (style.maxWidth ?? 92)) / 100;
  const boxPaddingX = style.hasBackground ? 18 * scale : 8 * scale;
  const boxPaddingY = style.hasBackground ? 10 * scale : 4 * scale;
  const borderRadius = style.hasBackground ? 14 * scale : 0;

  // Build rendered items / words with spacing
  interface RenderWord {
    text: string;
    isActive: boolean;
    color: string;
    weight: string;
    width: number;
    textWidth: number;
  }

  const renderWords: RenderWord[] = [];
  const microGapPx = style.enableWordHighlight ? Math.max(1.5, Math.round(2 * scale)) : 0;

  const displayWords = expandWordsToFineGrained(caption.words);

  if (style.enableWordHighlight && displayWords.length > 0) {
    displayWords.forEach((w: CaptionWord, idx: number) => {
      let prefixSpace = '';
      if (idx > 0) {
        const prevW = displayWords[idx - 1];
        const testJoin = formatCaptionWordsText([prevW, w]);
        if (testJoin.includes(' ')) {
          prefixSpace = ' ';
        }
      }

      const isActive = activeWordIndex === idx;
      const wordWeight = isActive ? '800' : baseWeight;
      const wordColor = isActive ? style.highlightColor || '#FACC15' : style.textColor || '#FFFFFF';

      if (prefixSpace) {
        ctx.font = `${baseWeight} ${fontSize}px "${fontName}", sans-serif`;
        const sw = ctx.measureText(prefixSpace).width;
        renderWords.push({
          text: prefixSpace,
          isActive: false,
          color: wordColor,
          weight: baseWeight,
          width: sw,
          textWidth: sw,
        });
      }

      const isLastWord = idx === displayWords.length - 1;
      const nextHasSpace = !isLastWord && formatCaptionWordsText([w, displayWords[idx + 1]]).includes(' ');
      const gapRight = (!isLastWord && !nextHasSpace) ? microGapPx : 0;

      ctx.font = `${wordWeight} ${fontSize}px "${fontName}", sans-serif`;
      const rawWidth = ctx.measureText(w.word).width;
      renderWords.push({
        text: w.word,
        isActive,
        color: wordColor,
        weight: wordWeight,
        width: rawWidth + scaleBufferPx * 2 + gapRight,
        textWidth: rawWidth,
      });
    });
  } else {
    // Static text
    const text = caption.text;
    ctx.font = `${baseWeight} ${fontSize}px "${fontName}", sans-serif`;
    const sw = ctx.measureText(text).width;
    renderWords.push({
      text,
      isActive: false,
      color: style.textColor || '#FFFFFF',
      weight: baseWeight,
      width: sw,
      textWidth: sw,
    });
  }

  // Wrap items into lines based on maxWidth
  interface LineItem {
    words: RenderWord[];
    width: number;
  }

  const lines: LineItem[] = [];
  let currentLineWords: RenderWord[] = [];
  let currentLineWidth = 0;
  const maxContentWidth = maxWidth - boxPaddingX * 2;

  renderWords.forEach((rw) => {
    // Handle manual newlines in text
    if (rw.text.includes('\n')) {
      const parts = rw.text.split('\n');
      parts.forEach((part, pIdx) => {
        if (pIdx > 0) {
          lines.push({ words: currentLineWords, width: currentLineWidth });
          currentLineWords = [];
          currentLineWidth = 0;
        }
        if (part) {
          const partWidth = ctx.measureText(part).width;
          currentLineWords.push({ ...rw, text: part, width: partWidth });
          currentLineWidth += partWidth;
        }
      });
      return;
    }

    if (currentLineWidth + rw.width > maxContentWidth && currentLineWords.length > 0) {
      lines.push({ words: currentLineWords, width: currentLineWidth });
      currentLineWords = [rw];
      currentLineWidth = rw.width;
    } else {
      currentLineWords.push(rw);
      currentLineWidth += rw.width;
    }
  });

  if (currentLineWords.length > 0) {
    lines.push({ words: currentLineWords, width: currentLineWidth });
  }

  // Compute total bounding box
  const totalTextHeight = lines.length * lineHeight;
  const maxLineWidth = Math.max(...lines.map((l) => l.width), 0);
  const totalBoxWidth = maxLineWidth + boxPaddingX * 2;
  const totalBoxHeight = totalTextHeight + boxPaddingY * 2;

  // Center position X & bottom percentage Y
  const centerX = (width * (style.positionX ?? 50)) / 100;
  const bottomDist = (height * (style.positionY ?? 15)) / 100;
  const boxBottomY = height - bottomDist;
  const boxTopY = boxBottomY - totalBoxHeight;
  const boxLeftX = centerX - totalBoxWidth / 2;

  // 1. Draw Background Box if enabled
  if (style.hasBackground) {
    ctx.save();
    ctx.fillStyle = hexToRgba(style.backgroundColor || '#27272A', style.backgroundOpacity ?? 75);
    drawRoundRect(ctx, boxLeftX, boxTopY, totalBoxWidth, totalBoxHeight, borderRadius);
    ctx.restore();
  }

  // 2. Draw Text with Sticker Pop-up Layering:
  // (1) Inactive Words Shadows, Outlines & Fills -> (2) Active Pop-up Word Shadow, Outline & Fill on Top!
  const textAlign = style.textAlign || 'center';
  let startY = boxTopY + boxPaddingY + lineHeight / 2;

  lines.forEach((line) => {
    let startX = boxLeftX + boxPaddingX;
    if (textAlign === 'center') {
      startX = centerX - line.width / 2;
    } else if (textAlign === 'right') {
      startX = boxLeftX + totalBoxWidth - boxPaddingX - line.width;
    }

    let cursorX = startX;
    const positionedWords = line.words.map((w) => {
      const slotStart = cursorX;
      // จัดตัวหนังสือจริงให้อยู่กึ่งกลางของ "ช่อง" ที่จองไว้ (ช่อง = ตัวหนังสือ + buffer 2 ข้าง)
      const glyphX = slotStart + (w.width - w.textWidth) / 2;
      cursorX += w.width;

      const shouldScale = w.isActive && style.enableWordHighlight && (style.highlightScale ?? 1.15) > 1.0;
      const wordScale = shouldScale ? (style.highlightScale ?? 1.15) : 1.0;
      const wordCenterX = glyphX + w.textWidth / 2;
      const wordCenterY = startY;

      return {
        ...w,
        x: glyphX,
        shouldScale,
        wordScale,
        wordCenterX,
        wordCenterY,
      };
    });

    const inactiveWords = positionedWords.filter((pw) => !pw.isActive || !style.enableWordHighlight);
    const activeWords = positionedWords.filter((pw) => pw.isActive && style.enableWordHighlight);

    // --- PHASE 1: Base Layer (Inactive Words) ---
    // A. Inactive Shadows
    if (style.hasShadow) {
      inactiveWords.forEach((pw) => {
        ctx.font = `${pw.weight} ${fontSize}px "${fontName}", sans-serif`;
        ctx.save();
        ctx.shadowColor = hexToRgba(style.shadowColor || '#000000', (style.shadowOpacity ?? 0.8) * 100);
        ctx.shadowBlur = (style.shadowBlur || 8) * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4 * scale;
        ctx.fillStyle = pw.color;
        ctx.fillText(pw.text, pw.x, startY);
        ctx.restore();
      });
    }

    // B. Inactive Outlines
    if (style.hasOutline && style.outlineWidth > 0) {
      inactiveWords.forEach((pw) => {
        ctx.font = `${pw.weight} ${fontSize}px "${fontName}", sans-serif`;
        ctx.save();
        ctx.strokeStyle = style.outlineColor || '#000000';
        ctx.lineWidth = style.outlineWidth * scale * 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(pw.text, pw.x, startY);
        ctx.restore();
      });
    }

    // C. Inactive Text Fills
    inactiveWords.forEach((pw) => {
      ctx.font = `${pw.weight} ${fontSize}px "${fontName}", sans-serif`;
      ctx.save();
      ctx.fillStyle = pw.color;
      ctx.fillText(pw.text, pw.x, startY);
      ctx.restore();
    });

    // --- PHASE 2: Sticker Pop-up Layer (Active Highlighted Words on Top) ---
    activeWords.forEach((pw) => {
      ctx.font = `${pw.weight} ${fontSize}px "${fontName}", sans-serif`;

      const applyScaleTransform = () => {
        if (pw.shouldScale) {
          ctx.save();
          ctx.translate(pw.wordCenterX, pw.wordCenterY);
          ctx.scale(pw.wordScale, pw.wordScale);
          ctx.translate(-pw.wordCenterX, -pw.wordCenterY);
        }
      };

      const restoreScaleTransform = () => {
        if (pw.shouldScale) {
          ctx.restore();
        }
      };

      // 1. Active Word Shadow
      if (style.hasShadow) {
        applyScaleTransform();
        ctx.save();
        ctx.shadowColor = hexToRgba(style.shadowColor || '#000000', (style.shadowOpacity ?? 0.8) * 100);
        ctx.shadowBlur = (style.shadowBlur || 8) * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4 * scale;
        ctx.fillStyle = pw.color;
        ctx.fillText(pw.text, pw.x, startY);
        ctx.restore();
        restoreScaleTransform();
      }

      // 2. Active Word Outline (Framing the pop-up above inactive words)
      if (style.hasOutline && style.outlineWidth > 0) {
        applyScaleTransform();
        ctx.save();
        ctx.strokeStyle = style.outlineColor || '#000000';
        ctx.lineWidth = style.outlineWidth * scale * 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(pw.text, pw.x, startY);
        ctx.restore();
        restoreScaleTransform();
      }

      // 3. Active Word Neon Glow Aura
      applyScaleTransform();
      ctx.save();
      const glowColor = style.highlightColor || '#FACC15';
      ctx.shadowColor = hexToRgba(glowColor, 80);
      ctx.shadowBlur = 12 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = pw.color;
      ctx.fillText(pw.text, pw.x, startY);
      ctx.restore();
      restoreScaleTransform();

      // 4. Active Word Crisp Text Fill
      applyScaleTransform();
      ctx.save();
      ctx.fillStyle = pw.color;
      ctx.fillText(pw.text, pw.x, startY);
      ctx.restore();
      restoreScaleTransform();
    });

    startY += lineHeight;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Canvas toBlob failed');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Generate full sequence of subtitle PNG frames and the ffconcat script
 */
export async function generateCaptionImageSequence(
  options: RenderSequenceOptions,
  onProgress?: (progress: number, message: string) => void
): Promise<RenderSequenceResult> {
  const { captions, style, videoWidth, videoHeight, videoDuration } = options;
  const frames: SubtitleFrame[] = [];

  // Create single reusable offscreen canvas for rendering all frames
  const sharedCanvas =
    typeof document !== 'undefined' ? document.createElement('canvas') : undefined;

  // 1. Generate transparent frame for silence / gaps
  const emptyFrameData = await renderSubtitleCanvas(
    null,
    null,
    style,
    videoWidth,
    videoHeight,
    sharedCanvas
  );
  frames.push({
    filename: 'sub_empty.png',
    data: emptyFrameData,
    duration: 0,
  });

  interface TimelineSegment {
    filename: string;
    duration: number;
    caption: CaptionItem | null;
    activeWordIndex: number | null;
  }

  const timeline: TimelineSegment[] = [];
  let lastTime = 0;

  // Filter and sort valid captions
  const validCaptions = [...captions]
    .filter((c) => c.text && c.text.trim() && c.end > c.start)
    .sort((a, b) => a.start - b.start);

  let frameCounter = 0;

  for (let i = 0; i < validCaptions.length; i++) {
    const cue = validCaptions[i];
    const actualStart = Math.max(lastTime, cue.start);
    const actualEnd = Math.max(actualStart + 0.01, cue.end);

    // Gap between previous cue and this cue (accurate threshold > 10ms)
    if (actualStart > lastTime + 0.01) {
      const gapDuration = actualStart - lastTime;
      timeline.push({
        filename: 'sub_empty.png',
        duration: gapDuration,
        caption: null,
        activeWordIndex: null,
      });
    }

    const cueDisplayWords = expandWordsToFineGrained(cue.words);
    if (style.enableWordHighlight && cueDisplayWords.length > 0) {
      // Sort words by start time
      const sortedWords = [...cueDisplayWords].sort((a, b) => a.start - b.start);
      let currentCueTime = actualStart;

      for (let wIdx = 0; wIdx < sortedWords.length; wIdx++) {
        const w = sortedWords[wIdx];
        const nextWordStart = wIdx < sortedWords.length - 1 ? sortedWords[wIdx + 1].start : actualEnd;

        // 1. If there's a pre-word gap before word 0, show normal unhighlighted caption
        if (wIdx === 0 && w.start > currentCueTime + 0.01) {
          const preDur = Math.min(w.start, actualEnd) - currentCueTime;
          if (preDur > 0.01) {
            const fname = `sub_${frameCounter++}.png`;
            timeline.push({
              filename: fname,
              duration: preDur,
              caption: cue,
              activeWordIndex: null, // all normal text
            });
            currentCueTime += preDur;
          }
        }

        // 2. Word active segment: continuous until the next word starts (or until actualEnd for last word)
        let wordEndLimit = wIdx === sortedWords.length - 1
          ? actualEnd
          : Math.min(actualEnd, Math.max(w.end, nextWordStart));

        // Guard: Prevent time regression in case of overlapping word timestamps
        wordEndLimit = Math.max(currentCueTime, wordEndLimit);

        // Exact duration calculation without artificial minimum padding
        const segDur = wordEndLimit - currentCueTime;
        if (segDur > 0.005) {
          const fname = `sub_${frameCounter++}.png`;
          timeline.push({
            filename: fname,
            duration: segDur,
            caption: cue,
            activeWordIndex: wIdx,
          });
        }

        currentCueTime = wordEndLimit;
      }

      // 3. If there is trailing duration within the cue after all words
      if (actualEnd > currentCueTime + 0.005) {
        const remainingDur = actualEnd - currentCueTime;
        const fname = `sub_${frameCounter++}.png`;
        timeline.push({
          filename: fname,
          duration: remainingDur,
          caption: cue,
          activeWordIndex: sortedWords.length - 1,
        });
        currentCueTime = actualEnd;
      }
    } else {
      // Static cue
      const cueDur = Math.max(0.01, actualEnd - actualStart);
      const fname = `sub_${frameCounter++}.png`;
      timeline.push({
        filename: fname,
        duration: cueDur,
        caption: cue,
        activeWordIndex: null,
      });
    }

    lastTime = actualEnd;
  }

  // Trailing silence until video duration
  if (videoDuration > lastTime + 0.01) {
    timeline.push({
      filename: 'sub_empty.png',
      duration: videoDuration - lastTime,
      caption: null,
      activeWordIndex: null,
    });
  }

  // 2. Render unique PNG frames using sharedCanvas
  const totalRenders = timeline.filter((t) => t.caption !== null).length;
  let renderedCount = 0;

  for (const seg of timeline) {
    if (seg.caption !== null) {
      const pngData = await renderSubtitleCanvas(
        seg.caption,
        seg.activeWordIndex,
        style,
        videoWidth,
        videoHeight,
        sharedCanvas
      );

      frames.push({
        filename: seg.filename,
        data: pngData,
        duration: seg.duration,
      });

      renderedCount++;
      if (onProgress) {
        const pct = Math.round((renderedCount / Math.max(1, totalRenders)) * 100);
        onProgress(pct, `กำลังวาดซับไตเติลด้วย Canvas Engine... (${renderedCount}/${totalRenders})`);
      }
    }
  }

  // Release shared canvas memory
  if (sharedCanvas) {
    sharedCanvas.width = 1;
    sharedCanvas.height = 1;
  }

  // 3. Build ffconcat format string with 4-decimal precision
  let concatLines = 'ffconcat version 1.0\n';
  timeline.forEach((seg) => {
    concatLines += `file '${seg.filename}'\n`;
    concatLines += `duration ${seg.duration.toFixed(4)}\n`;
  });
  // ffconcat requires the last file to be repeated without duration
  if (timeline.length > 0) {
    concatLines += `file '${timeline[timeline.length - 1].filename}'\n`;
  }

  return {
    frames,
    concatFileContent: concatLines,
  };
}
