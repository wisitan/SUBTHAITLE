'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileVideo,
  FileAudio,
  Sparkles,
  Film,
  Check,
  AlignLeft,
  Palette,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { VideoPlayer } from '@/components/video-player';
import { CaptionTable } from '@/components/caption-table';
import { StyleEditor } from '@/components/style-editor';
import { PresetManager } from '@/components/preset-manager';
import { ExportMenu } from '@/components/export-menu';

export default function EditorPage() {
  const file = useAppStore((s) => s.file);
  const videoUrl = useAppStore((s) => s.videoUrl);
  const captions = useAppStore((s) => s.captions);
  const mediaDuration = useAppStore((s) => s.mediaDuration);

  const [activeTab, setActiveTab] = useState<'captions' | 'style' | 'presets'>('captions');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // If no active captions or media loaded, show friendly empty state
  if (!videoUrl && captions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white">ยังไม่มีโปรเจกต์ที่กำลังทำงาน</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            กรุณาอัปโหลดไฟล์วิดีโอหรือไฟล์เสียง และถอดเสียงภาษาไทยจากหน้าแรกก่อนเข้าสู่หน้าแก้ไขซับไตเติลค่ะ
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg transition-all"
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
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-sm">
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
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              title="กลับสู่หน้าหลัก"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                {file?.type.startsWith('audio/') ? (
                  <FileAudio className="w-5 h-5" />
                ) : (
                  <FileVideo className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                  {file?.name || 'SUBTHAITLE Project'}
                </h1>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span>ความยาว: {mediaDuration ? `${Math.round(mediaDuration)}s` : '--'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{captions.length} ท่อนซับ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Export Menu */}
          <div className="flex items-center gap-2">
            <ExportMenu onShowToast={showToast} />
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Video Player (42% width on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <VideoPlayer />

          {/* Quick tips card below video */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>คีย์ลัดสำหรับ Video Player:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-1 leading-relaxed">
              <li>กด <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs">Spacebar</kbd> เพื่อ เล่น / หยุดชั่วคราว</li>
              <li>กด <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs">←</kbd> หรือ <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs">→</kbd> เพื่อ ย้อน/ข้าม 2 วินาที</li>
              <li>คลิกปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs">▶</kbd> ในแถวซับเพื่อกระโดดไปเล่นที่ท่อนนั้นทันที</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Studio Tabs (Captions vs Style vs Presets) (58% width on desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-3 min-h-[750px]">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center p-1.5 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl shadow-lg gap-1 shrink-0">
            {/* Tab 1: Captions */}
            <button
              type="button"
              onClick={() => setActiveTab('captions')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'captions'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
              <span>📝 ข้อความซับ</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                  activeTab === 'captions'
                    ? 'bg-zinc-950/20 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {captions.length}
              </span>
            </button>

            {/* Tab 2: Style */}
            <button
              type="button"
              onClick={() => setActiveTab('style')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'style'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>🎨 ปรับแต่งฟอนต์</span>
            </button>

            {/* Tab 3: Presets */}
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>⚡ ธีมสำเร็จรูป</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col min-h-0">
            {activeTab === 'captions' ? (
              <CaptionTable />
            ) : activeTab === 'style' ? (
              <StyleEditor />
            ) : (
              <PresetManager />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
