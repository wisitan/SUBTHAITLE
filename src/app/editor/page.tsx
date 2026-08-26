'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  FileVideo,
  FileAudio,
  Sparkles,
  Film,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { VideoPlayer } from '@/components/video-player';
import { CaptionTable } from '@/components/caption-table';
import { generateSrt, generateVtt } from '@/lib/srt';

export default function EditorPage() {
  const file = useAppStore((s) => s.file);
  const videoUrl = useAppStore((s) => s.videoUrl);
  const captions = useAppStore((s) => s.captions);
  const mediaDuration = useAppStore((s) => s.mediaDuration);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadSrt = () => {
    if (!captions.length) return;
    const srtData = generateSrt(captions);
    const blob = new Blob([srtData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '') || 'subthaitle'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ .SRT เรียบร้อย');
  };

  const handleDownloadVtt = () => {
    if (!captions.length) return;
    const vttData = generateVtt(captions);
    const blob = new Blob([vttData], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '') || 'subthaitle'}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ .VTT เรียบร้อย');
  };

  // If no active captions or media loaded, show friendly empty state
  if (!videoUrl && captions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">ยังไม่มีโปรเจกต์ที่กำลังทำงาน</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            กรุณาอัปโหลดไฟล์วิดีโอหรือไฟล์เสียง และถอดเสียงภาษาไทยจากหน้าแรกก่อนเข้าสู่หน้าแก้ไขซับไตเติลค่ะ
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลักเพื่ออัปโหลดไฟล์</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-xs">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Left: Back button & File info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="กลับสู่หน้าหลัก"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                {file?.type.startsWith('audio/') ? (
                  <FileAudio className="w-4 h-4" />
                ) : (
                  <FileVideo className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                  {file?.name || 'SUBTHAITLE Project'}
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span>ความยาว: {mediaDuration ? `${Math.round(mediaDuration)}s` : '--'}</span>
                  <span>•</span>
                  <span className="text-emerald-400">{captions.length} ท่อนซับ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Export & Tools */}
          <div className="flex items-center gap-2">
            {/* Export SRT */}
            <button
              type="button"
              onClick={handleDownloadSrt}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/80 hover:border-orange-500/40 hover:text-orange-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="ดาวน์โหลดไฟล์ .SRT"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Export</span> .SRT
            </button>

            {/* Export VTT */}
            <button
              type="button"
              onClick={handleDownloadVtt}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/80 hover:border-emerald-500/40 hover:text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="ดาวน์โหลดไฟล์ WebVTT (.VTT)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span> .VTT
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Video Player (42% width on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <VideoPlayer />

          {/* Quick tips card below video */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>คีย์ลัดสำหรับ Video Player:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-400 pl-1">
              <li>กด <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Spacebar</kbd> เพื่อ เล่น / หยุดชั่วคราว</li>
              <li>กด <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">←</kbd> หรือ <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">→</kbd> เพื่อ ย้อน/ข้าม 2 วินาที</li>
              <li>คลิกปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">▶</kbd> ในแถวซับเพื่อกระโดดไปเล่นที่ท่อนนั้นทันที</li>
            </ul>
          </div>
        </div>

        {/* Right Column: WYSIWYG Caption Editor List (58% width on desktop) */}
        <div className="lg:col-span-7 h-full min-h-[500px]">
          <CaptionTable />
        </div>
      </main>
    </div>
  );
}
