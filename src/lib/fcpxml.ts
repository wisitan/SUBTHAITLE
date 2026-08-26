import { CaptionItem, CaptionStyle, CaptionWord } from './store';

export interface FcpxmlOptions {
  projectName?: string;
  fps?: number; // 24, 25, 29.97, 30, 50, 60 (default 30)
  width?: number; // default 1080
  height?: number; // default 1920
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

/**
 * Convert Hex color string (#RRGGBB or #RRGGBBAA) to FCPXML normalized float "R G B A" (0.0 to 1.0)
 */
export function hexToFcpxmlColor(hex: string, opacity: number = 1.0): string {
  if (!hex) return '1 1 1 1';
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length < 6) return '1 1 1 1';

  const r = (parseInt(cleanHex.substring(0, 2), 16) / 255).toFixed(4);
  const g = (parseInt(cleanHex.substring(2, 4), 16) / 255).toFixed(4);
  const b = (parseInt(cleanHex.substring(4, 6), 16) / 255).toFixed(4);
  const a = (opacity).toFixed(4);

  return `${r} ${g} ${b} ${a}`;
}

/**
 * Format a frame number or duration as FCPXML time string e.g. "120/30s" or "4s"
 */
function formatFcpxmlTime(frames: number, fps: number): string {
  // If integer seconds
  if (frames % fps === 0) {
    return `${frames / fps}s`;
  }
  return `${frames}/${fps}s`;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generate FCPXML v1.10 document string from captions and style settings
 */
export function generateFcpxml(
  captions: CaptionItem[],
  style: CaptionStyle,
  options: FcpxmlOptions = {}
): string {
  const fps = options.fps || 30;
  const projectName = options.projectName || 'SUBTHAITLE Project';
  
  // Resolve resolution from options or aspectRatio
  let width = options.width || 1080;
  let height = options.height || 1920;
  if (options.aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (options.aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  }

  // Calculate snapped frame boundaries for each cue
  const snappedCues = captions.map((cue, idx) => {
    const startFrame = Math.max(0, Math.round(cue.start * fps));
    const endFrame = Math.max(startFrame + 1, Math.round(cue.end * fps));
    return {
      ...cue,
      idx: idx + 1,
      startFrame,
      endFrame,
      durationFrames: endFrame - startFrame,
    };
  });

  const totalFrames = snappedCues.length > 0
    ? Math.max(...snappedCues.map((c) => c.endFrame)) + fps
    : fps * 10;

  // Calculate vertical position offset for FCPXML
  // In FCPXML coordinate system: center is 0 0, top is +height/2, bottom is -height/2
  // positionY is percentage from bottom (e.g. 15% -> -height/2 + 0.15 * height)
  const posYPercent = (style.positionY ?? 15) / 100;
  const posYPixels = Math.round(-height / 2 + posYPercent * height);
  const posXPercent = ((style.positionX ?? 50) - 50) / 100;
  const posXPixels = Math.round(posXPercent * width);

  // Typography properties
  const fontFamily = style.fontFamily || 'Noto Sans Thai';
  const fontSize = Math.round(style.fontSize * 2.2); // Scale up for 1080p canvas
  const fontColor = hexToFcpxmlColor(style.textColor || '#FFFFFF');
  const isBold = style.fontWeight === 'bold' || style.fontWeight === '700' || style.fontWeight === '800';
  const alignment = style.textAlign === 'left' ? 'left' : style.textAlign === 'right' ? 'right' : 'center';

  // Outline / Stroke
  const strokeColor = style.hasOutline
    ? hexToFcpxmlColor(style.outlineColor || '#000000')
    : '0 0 0 0';
  const strokeWidth = style.hasOutline ? (style.outlineWidth || 3) * 2 : 0;

  // Drop Shadow
  const shadowColor = style.hasShadow
    ? hexToFcpxmlColor(style.shadowColor || '#000000', style.shadowOpacity ?? 0.8)
    : '0 0 0 0';
  const shadowBlur = style.hasShadow ? (style.shadowBlur || 8) : 0;

  // Word Highlight color
  const highlightColor = hexToFcpxmlColor(style.highlightColor || '#FACC15');

  // Build FCPXML string
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormatCustom" frameDuration="1/${fps}s" width="${width}" height="${height}" colorSpace="1-1-1 (Rec. 709)"/>
    <effect id="r2" name="Basic Title" uid=".../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti"/>
  </resources>
  <library>
    <event name="SUBTHAITLE Captions">
      <project name="${escapeXml(projectName)}">
        <sequence format="r1" duration="${formatFcpxmlTime(totalFrames, fps)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
            <gap name="Caption Timeline" offset="0s" start="0s" duration="${formatFcpxmlTime(totalFrames, fps)}">
`;

  // Add Title elements for each caption cue
  snappedCues.forEach((cue) => {
    const titleName = `TH_${String(cue.idx).padStart(3, '0')}`;
    const offsetTime = formatFcpxmlTime(cue.startFrame, fps);
    const durationTime = formatFcpxmlTime(cue.durationFrames, fps);
    const styleId = `ts_${cue.idx}`;

    xml += `              <title name="${titleName}" lane="1" offset="${offsetTime}" duration="${durationTime}" ref="r2">
                <adjust-transform position="${posXPixels} ${posYPixels}"/>
                <text>
                  <text-style ref="${styleId}">${escapeXml(cue.text)}</text-style>
                </text>
                <text-style-def id="${styleId}">
                  <text-style font="${fontFamily}" fontSize="${fontSize}" fontColor="${fontColor}" bold="${isBold ? '1' : '0'}" alignment="${alignment}" strokeColor="${strokeColor}" strokeWidth="${strokeWidth}" shadowColor="${shadowColor}" shadowOffset="0 -2" shadowBlurRadius="${shadowBlur}"/>
                </text-style-def>
              </title>
`;
  });

  // If Word Highlight is enabled, add highlighted word clips in Lane 2
  if (style.enableWordHighlight) {
    let highlightIndex = 1;
    snappedCues.forEach((cue) => {
      if (cue.words && cue.words.length > 0) {
        cue.words.forEach((wordItem: CaptionWord) => {
          if (!wordItem.word.trim()) return;

          const wStartFrame = Math.max(cue.startFrame, Math.round(wordItem.start * fps));
          const wEndFrame = Math.min(cue.endFrame, Math.max(wStartFrame + 1, Math.round(wordItem.end * fps)));
          const wDurationFrames = wEndFrame - wStartFrame;

          if (wDurationFrames > 0) {
            const hTitleName = `HL_${String(highlightIndex).padStart(3, '0')}`;
            const hOffsetTime = formatFcpxmlTime(wStartFrame, fps);
            const hDurationTime = formatFcpxmlTime(wDurationFrames, fps);
            const hStyleId = `ts_hl_${highlightIndex}`;

            xml += `              <title name="${hTitleName}" lane="2" offset="${hOffsetTime}" duration="${hDurationTime}" ref="r2">
                <adjust-transform position="${posXPixels} ${posYPixels}"/>
                <text>
                  <text-style ref="${hStyleId}">${escapeXml(cue.text)}</text-style>
                </text>
                <text-style-def id="${hStyleId}">
                  <text-style font="${fontFamily}" fontSize="${fontSize}" fontColor="${highlightColor}" bold="1" alignment="${alignment}" strokeColor="${strokeColor}" strokeWidth="${strokeWidth}" shadowColor="${shadowColor}" shadowOffset="0 -2" shadowBlurRadius="${shadowBlur}"/>
                </text-style-def>
              </title>
`;
            highlightIndex++;
          }
        });
      }
    });
  }

  xml += `            </gap>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

  return xml;
}

/**
 * Trigger browser file download for .fcpxml file
 */
export function downloadFcpxml(
  captions: CaptionItem[],
  style: CaptionStyle,
  filename: string = 'subtitles.fcpxml',
  options: FcpxmlOptions = {}
): void {
  const xmlContent = generateFcpxml(captions, style, {
    projectName: filename.replace(/\.fcpxml$/i, ''),
    ...options,
  });

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.fcpxml') ? filename : `${filename}.fcpxml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
