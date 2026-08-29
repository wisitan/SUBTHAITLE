import { CaptionItem, CaptionStyle, CaptionWord } from './store';
import { formatCaptionWordsText } from './thai-text';

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
  }

  const renderWords: RenderWord[] = [];

  if (style.enableWordHighlight && caption.words && caption.words.length > 0) {
    caption.words.forEach((w: CaptionWord, idx: number) => {
      let prefixSpace = '';
      if (idx > 0) {
        const prevW = caption.words![idx - 1];
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
        renderWords.push({
          text: prefixSpace,
          isActive: false,
          color: wordColor,
          weight: baseWeight,
          width: ctx.measureText(prefixSpace).width,
        });
      }

      ctx.font = `${wordWeight} ${fontSize}px "${fontName}", sans-serif`;
      renderWords.push({
        text: w.word,
        isActive,
        color: wordColor,
        weight: wordWeight,
        width: ctx.measureText(w.word).width,
      });
    });
  } else {
    // Static text
    const text = caption.text;
    ctx.font = `${baseWeight} ${fontSize}px "${fontName}", sans-serif`;
    renderWords.push({
      text,
      isActive: false,
      color: style.textColor || '#FFFFFF',
      weight: baseWeight,
      width: ctx.measureText(text).width,
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

  // 2. Draw Text (Shadow + Outline + Fill)
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

    line.words.forEach((w) => {
      ctx.font = `${w.weight} ${fontSize}px "${fontName}", sans-serif`;

      const shouldScale = w.isActive && style.enableWordHighlight && (style.highlightScale ?? 1.15) > 1.0;
      const wordScale = shouldScale ? (style.highlightScale ?? 1.15) : 1.0;

      if (shouldScale) {
        ctx.save();
        const wordCenterX = cursorX + w.width / 2;
        const wordCenterY = startY;
        ctx.translate(wordCenterX, wordCenterY);
        ctx.scale(wordScale, wordScale);
        ctx.translate(-wordCenterX, -wordCenterY);
      }

      // A. Shadow
      if (style.hasShadow) {
        ctx.save();
        ctx.shadowColor = hexToRgba(style.shadowColor || '#000000', (style.shadowOpacity ?? 0.8) * 100);
        ctx.shadowBlur = (style.shadowBlur || 8) * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4 * scale;
        ctx.fillStyle = w.color;
        ctx.fillText(w.text, cursorX, startY);
        ctx.restore();
      }

      // B. Multi-angle Outline (Continuous stroke)
      if (style.hasOutline && style.outlineWidth > 0) {
        ctx.save();
        ctx.strokeStyle = style.outlineColor || '#000000';
        ctx.lineWidth = style.outlineWidth * scale * 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(w.text, cursorX, startY);
        ctx.restore();
      }

      // C. Fill Text
      ctx.save();
      ctx.fillStyle = w.color;
      ctx.fillText(w.text, cursorX, startY);
      ctx.restore();

      if (shouldScale) {
        ctx.restore();
      }

      cursorX += w.width;
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

    if (style.enableWordHighlight && cue.words && cue.words.length > 0) {
      // Sort words by start time
      const sortedWords = [...cue.words].sort((a, b) => a.start - b.start);
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
