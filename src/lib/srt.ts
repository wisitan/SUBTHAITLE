import { CaptionItem } from './store';
import { cleanThaiText } from './thai-text';

/**
 * Formats seconds (e.g. 75.342) into SRT timestamp "00:01:15,342"
 */
export function formatSrtTime(seconds: number): string {
  const safeSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const totalMs = Math.round(safeSec * 1000);
  const ms = totalMs % 1000;
  const totalSecs = Math.floor(totalMs / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number, size = 2) => n.toString().padStart(size, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Formats seconds into WebVTT timestamp "00:01:15.342"
 */
export function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(',', '.');
}

/**
 * Parses timestamp string ("00:01:15,342" or "00:01:15.342") into seconds
 */
export function parseSrtTime(timestamp: string): number {
  if (!timestamp) return 0;
  const normalized = timestamp.trim().replace(',', '.');
  const parts = normalized.split(':');
  
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  
  return parseFloat(normalized) || 0;
}

/**
 * Generates an SRT subtitle string from an array of CaptionItems
 */
export function generateSrt(captions: CaptionItem[]): string {
  if (!captions || captions.length === 0) return '';

  return captions
    .map((cap, index) => {
      const idx = index + 1;
      const start = formatSrtTime(cap.start);
      const end = formatSrtTime(cap.end);
      const text = cleanThaiText(cap.text);
      return `${idx}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Generates a WebVTT subtitle string from an array of CaptionItems
 */
export function generateVtt(captions: CaptionItem[]): string {
  if (!captions || captions.length === 0) return 'WEBVTT\n\n';

  const body = captions
    .map((cap, index) => {
      const idx = index + 1;
      const start = formatVttTime(cap.start);
      const end = formatVttTime(cap.end);
      const text = cleanThaiText(cap.text);
      return `${idx}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Parses raw SRT file text into structured CaptionItems
 */
export function parseSrt(srtContent: string): CaptionItem[] {
  if (!srtContent) return [];

  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const captions: CaptionItem[] = [];

  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return;

    let timeLineIndex = 0;
    // Check if line 0 is index number
    if (/^\d+$/.test(lines[0].trim()) && lines.length >= 3) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) return;

    const [startStr, endStr] = timeLine.split('-->');
    const start = parseSrtTime(startStr);
    const end = parseSrtTime(endStr);

    const textLines = lines.slice(timeLineIndex + 1);
    const text = cleanThaiText(textLines.join(' '));

    if (text) {
      captions.push({
        id: `srt-${index + 1}-${Date.now().toString(36)}`,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        text,
      });
    }
  });

  return captions;
}
