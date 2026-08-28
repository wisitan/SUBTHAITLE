import { describe, it, expect } from 'vitest';
import { generateSrt, generateVtt, parseSrt, formatSrtTime, formatVttTime } from '../srt';
import { generateAss, hexToAssColor } from '../ass';
import { generatePremiereXml } from '../xml';
import { generateFcpxml, hexToFcpxmlColor } from '../fcpxml';
import { CaptionItem, CaptionStyle, defaultCaptionStyle } from '../store';

describe('subtitle export formats generation and parsing', () => {
  const sampleCaptions: CaptionItem[] = [
    {
      id: 'cue-1',
      start: 1.25,
      end: 3.5,
      text: 'สวัสดีครับ ยินดีต้อนรับสู่ SUBTHAITLE',
      words: [
        { word: 'สวัสดีครับ', start: 1.25, end: 1.8 },
        { word: 'ยินดีต้อนรับสู่', start: 1.8, end: 2.7 },
        { word: 'SUBTHAITLE', start: 2.7, end: 3.5 },
      ],
    },
    {
      id: 'cue-2',
      start: 4.0,
      end: 6.2,
      text: 'สร้างซับไตเติลภาษาไทยง่ายๆ ด้วย AI',
      words: [
        { word: 'สร้างซับไตเติล', start: 4.0, end: 4.8 },
        { word: 'ภาษาไทยง่ายๆ', start: 4.8, end: 5.5 },
        { word: 'ด้วย', start: 5.5, end: 5.7 },
        { word: 'AI', start: 5.7, end: 6.2 },
      ],
    },
  ];

  const style: CaptionStyle = {
    ...defaultCaptionStyle,
    fontSize: 24,
    textColor: '#FFFFFF',
    highlightColor: '#FACC15',
  };

  it('formats SRT & VTT timestamps with 0-padding accurately', () => {
    expect(formatSrtTime(75.342)).toBe('00:01:15,342');
    expect(formatVttTime(75.342)).toBe('00:01:15.342');
  });

  it('generates valid SRT formatted string', () => {
    const srt = generateSrt(sampleCaptions);
    expect(srt).toContain('1\n00:00:01,250 --> 00:00:03,500\nสวัสดีครับ ยินดีต้อนรับสู่ SUBTHAITLE');
    expect(srt).toContain('2\n00:00:04,000 --> 00:00:06,200\nสร้างซับไตเติลภาษาไทยง่ายๆ ด้วย AI');
  });

  it('generates valid WebVTT string with header', () => {
    const vtt = generateVtt(sampleCaptions);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:01.250 --> 00:00:03.500');
  });

  it('parses SRT string back into CaptionItem objects correctly', () => {
    const srt = generateSrt(sampleCaptions);
    const parsed = parseSrt(srt);
    expect(parsed.length).toBe(2);
    expect(parsed[0].start).toBeCloseTo(1.25, 2);
    expect(parsed[0].end).toBeCloseTo(3.5, 2);
    expect(parsed[0].text).toContain('สวัสดีครับ ยินดีต้อนรับสู่ SUBTHAITLE');
  });

  it('generates valid ASS subtitle with Script Info and Styles', () => {
    const ass = generateAss(sampleCaptions, style, { title: 'Test Project' });
    expect(ass).toContain('[Script Info]');
    expect(ass).toContain('[V4+ Styles]');
    expect(ass).toContain('[Events]');
    expect(ass).toContain('Dialogue:');
  });

  it('converts Hex color to ASS & FCPXML color correctly', () => {
    // White #FFFFFF in ASS is &H00FFFFFF
    expect(hexToAssColor('#FFFFFF', 100)).toBe('&H00FFFFFF');
    // FCPXML normalized RGBA
    const fcpxColor = hexToFcpxmlColor('#FFFFFF', 1.0);
    expect(fcpxColor).toContain('1.0000 1.0000 1.0000 1.0000');
  });

  it('generates valid Premiere XML and FCPXML with tracks', () => {
    const premXml = generatePremiereXml(sampleCaptions, style, { projectName: 'SubthaitleExport' });
    expect(premXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(premXml).toContain('<xmeml version="4">');
    expect(premXml).toContain('สวัสดีครับ ยินดีต้อนรับสู่ SUBTHAITLE');

    const fcpXml = generateFcpxml(sampleCaptions, style, { projectName: 'SubthaitleFCP' });
    expect(fcpXml).toContain('<!DOCTYPE fcpxml>');
    expect(fcpXml).toContain('<fcpxml version="1.10">');
  });
});
