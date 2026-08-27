import { CaptionItem, CaptionStyle } from './store';

export interface PremiereXmlOptions {
  projectName?: string;
  fps?: number; // 23.98, 24, 25, 29.97, 30, 50, 59.94, 60 (default 30)
  width?: number; // default 1080
  height?: number; // default 1920
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

/**
 * Convert Hex color string (#RRGGBB) to 0-255 RGB integers
 */
export function hexToRgb255(hex: string): { r: number; g: number; b: number; a: number } {
  if (!hex) return { r: 255, g: 255, b: 255, a: 255 };
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length < 6) return { r: 255, g: 255, b: 255, a: 255 };

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return { r, g, b, a: 255 };
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
 * Map FPS to FCP 7 XML timebase and NTSC flag
 */
function getRateConfig(fps: number): { timebase: number; ntsc: boolean } {
  if (fps === 29.97) return { timebase: 30, ntsc: true };
  if (fps === 23.98 || fps === 23.976) return { timebase: 24, ntsc: true };
  if (fps === 59.94) return { timebase: 60, ntsc: true };
  return { timebase: Math.round(fps), ntsc: false };
}

/**
 * Generate FCP 7 XML (Interchange format v4) compatible with Adobe Premiere Pro and DaVinci Resolve
 */
export function generatePremiereXml(
  captions: CaptionItem[],
  style: CaptionStyle,
  options: PremiereXmlOptions = {}
): string {
  const fps = options.fps || 30;
  const projectName = options.projectName || 'SUBTHAITLE Premiere Sequence';
  const { timebase, ntsc } = getRateConfig(fps);

  // Resolve resolution
  let width = options.width || 1080;
  let height = options.height || 1920;
  if (options.aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (options.aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  }

  // Snapped frame cues
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

  const totalDurationFrames = snappedCues.length > 0
    ? Math.max(...snappedCues.map((c) => c.endFrame)) + Math.round(fps * 2)
    : Math.round(fps * 10);

  const rgb = hexToRgb255(style.textColor || '#FFFFFF');

  // Vertical position for FCP 7 XML:
  // Center is 0.0, Top is -0.5, Bottom is +0.5
  // positionY is percentage from bottom (e.g. 15% -> 0.5 - 0.15 = +0.35)
  const posYPercent = (style.positionY ?? 15) / 100;
  const vertPos = Number((0.5 - posYPercent).toFixed(3));

  let clipitemsXml = '';

  snappedCues.forEach((cue) => {
    const clipId = `clipitem-${cue.idx}`;
    const safeText = escapeXml(cue.text);
    const escapedFont = escapeXml(style.fontFamily || 'Noto Sans Thai');
    const fontSize = Math.max(12, Math.round((style.fontSize || 20) * 1.5)); // scaled for Premiere NLE canvas

    clipitemsXml += `
        <clipitem id="${clipId}">
          <name>${escapeXml(cue.text.slice(0, 30))}</name>
          <duration>${cue.durationFrames}</duration>
          <rate>
            <timebase>${timebase}</timebase>
            <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
          </rate>
          <start>${cue.startFrame}</start>
          <end>${cue.endFrame}</end>
          <in>0</in>
          <out>${cue.durationFrames}</out>
          <alphatype>black</alphatype>
          <filter>
            <effect>
              <name>Text</name>
              <effectid>Text</effectid>
              <effecttype>generator</effecttype>
              <mediatype>video</mediatype>
              <parameter>
                <parameterid>str</parameterid>
                <name>Text</name>
                <value>${safeText}</value>
              </parameter>
              <parameter>
                <parameterid>font</parameterid>
                <name>Font</name>
                <value>${escapedFont}</value>
              </parameter>
              <parameter>
                <parameterid>fontsize</parameterid>
                <name>Size</name>
                <value>${fontSize}</value>
              </parameter>
              <parameter>
                <parameterid>fontcolor</parameterid>
                <name>Font Color</name>
                <value>
                  <alpha>255</alpha>
                  <red>${rgb.r}</red>
                  <green>${rgb.g}</green>
                  <blue>${rgb.b}</blue>
                </value>
              </parameter>
              <parameter>
                <parameterid>center</parameterid>
                <name>Center</name>
                <value>
                  <horiz>0</horiz>
                  <vert>${vertPos}</vert>
                </value>
              </parameter>
            </effect>
          </filter>
        </clipitem>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>${escapeXml(projectName)}</name>
    <duration>${totalDurationFrames}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${timebase}</timebase>
        <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
            </rate>
            <width>${width}</width>
            <height>${height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>${clipitemsXml}
        </track>
      </video>
    </media>
  </sequence>
</xmeml>`;
}

/**
 * 1-Click Download Helper for Premiere / DaVinci XML
 */
export function downloadPremiereXml(
  captions: CaptionItem[],
  style: CaptionStyle,
  filename = 'subtitles_premiere.xml',
  options: PremiereXmlOptions = {}
): void {
  const xmlContent = generatePremiereXml(captions, style, options);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
