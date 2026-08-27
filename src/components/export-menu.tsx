'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Film,
  FileCode,
  FileText,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { downloadFcpxml } from '@/lib/fcpxml';
import { downloadAss } from '@/lib/ass';
import { BurnVideoModal } from './burn-video-modal';

interface Props {
  onShowToast?: (message: string) => void;
}

export function ExportMenu({ onShowToast }: Props) {
  const file = useAppStore((s) => s.file);
  const captions = useAppStore((s) => s.captions);
  const style = useAppStore((s) => s.style);

  const [isOpen, setIsOpen] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBaseFilename = () => {
    return file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'subthaitle_export';
  };

  const handleExportFcpxml = () => {
    setIsOpen(false);
    if (!captions.length) {
      onShowToast?.('ไม่มีข้อมูลซับไตเติลสำหรับส่งออก');
      return;
    }
    const filename = `${getBaseFilename()}.fcpxml`;
    downloadFcpxml(captions, style, filename);
    onShowToast?.(`ดาวน์โหลด ${filename} เรียบร้อย (แสดงผลตามฟอนต์ที่ลงใน Mac)`);
  };

  const handleExportAss = () => {
    setIsOpen(false);
    if (!captions.length) {
      onShowToast?.('ไม่มีข้อมูลซับไตเติลสำหรับส่งออก');
      return;
    }
    const filename = `${getBaseFilename()}.ass`;
    downloadAss(captions, style, filename);
    onShowToast?.(`ดาวน์โหลด ${filename} เรียบร้อย`);
  };

  const handleExportSrt = () => {
    setIsOpen(false);
    if (!captions.length) {
      onShowToast?.('ไม่มีข้อมูลซับไตเติลสำหรับส่งออก');
      return;
    }
    
    let srtContent = '';
    captions.forEach((c, idx) => {
      const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };
      srtContent += `${idx + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${getBaseFilename()}.srt`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.(`ดาวน์โหลด ${filename} เรียบร้อย`);
  };

  const handleExportVtt = () => {
    setIsOpen(false);
    if (!captions.length) {
      onShowToast?.('ไม่มีข้อมูลซับไตเติลสำหรับส่งออก');
      return;
    }

    let vttContent = 'WEBVTT\n\n';
    captions.forEach((c, idx) => {
      const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      };
      vttContent += `${idx + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n\n`;
    });

    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${getBaseFilename()}.vtt`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.(`ดาวน์โหลด ${filename} เรียบร้อย`);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Main Export Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export ผลงาน</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-3xl p-2 shadow-2xl z-[999] space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Label */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 mb-1">
            เลือกรูปแบบการส่งออก (Export Formats)
          </div>

          {/* Option 1: Burn MP4 Video (Hero Option) */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setBurnModalOpen(true);
            }}
            className="w-full text-left p-2.5 rounded-2xl hover:bg-orange-500/10 border border-transparent hover:border-orange-500/30 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>วิดีโอ MP4 (.mp4)</span>
                <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 text-[9px] font-bold">
                  ฮิตสุด 🔥
                </span>
              </div>
              <p className="text-[11px] text-amber-400/90 font-medium">
                ✨ ฝังฟอนต์และซับไตเติลตรงปก 100%
              </p>
              <p className="text-[10px] text-zinc-400">
                เลือกความละเอียด 720p / 1080p / 4K
              </p>
            </div>
          </button>

          {/* Option 2: FCPXML for Final Cut Pro */}
          <button
            type="button"
            onClick={handleExportFcpxml}
            className="w-full text-left p-2.5 rounded-2xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>Final Cut Pro (.fcpxml)</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                💡 ใช้ฟอนต์ที่ติดตั้งใน Mac (นำเข้าไทม์ไลน์ทันที)
              </p>
            </div>
          </button>

          <hr className="border-zinc-800/80 my-1" />

          {/* Option 3: SRT Subtitle */}
          <button
            type="button"
            onClick={handleExportSrt}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-900 transition-all flex items-center justify-between text-xs text-zinc-300 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>ซับไตเติล SubRip (.srt)</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">1-Click</span>
          </button>

          {/* Option 4: VTT Subtitle */}
          <button
            type="button"
            onClick={handleExportVtt}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-900 transition-all flex items-center justify-between text-xs text-zinc-300 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>ซับไตเติล WebVTT (.vtt)</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">1-Click</span>
          </button>

          {/* Option 5: ASS Subtitle */}
          <button
            type="button"
            onClick={handleExportAss}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-900 transition-all flex items-center justify-between text-xs text-zinc-300 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ซับไตเติลพร้อมสไตล์ (.ass)</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">1-Click</span>
          </button>
        </div>
      )}

      {/* Burn Video Modal */}
      <BurnVideoModal
        isOpen={burnModalOpen}
        onClose={() => setBurnModalOpen(false)}
      />
    </div>
  );
}
