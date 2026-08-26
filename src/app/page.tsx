'use client';

import React from 'react';
import { Header } from '@/components/header';
import { ProviderSelector } from '@/components/provider-selector';
import { UploadZone } from '@/components/upload-zone';
import {
  Sparkles,
  Zap,
  Sliders,
  FileCode2,
  CheckCircle,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Thai Caption Generator & Style Studio</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            สร้าง Subtitle ภาษาไทย <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              อัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            ถอดเสียงภาษาไทยด้วย AI แม่นยำระดับคำ ตัดคำเว้นวรรคถูกต้องตามหลักภาษา พร้อม Export เป็น{' '}
            <strong className="text-zinc-200">FCPXML, SRT</strong> หรือ{' '}
            <strong className="text-orange-400">Burn ฝังลง MP4 ทันทีบนเบราว์เซอร์</strong>
          </p>

          {/* Quick tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1 bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> เหมาะกับ TikTok / Reels / Shorts (9:16)
            </span>
            <span className="flex items-center gap-1 bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Word-level Karaoke Highlight
            </span>
            <span className="flex items-center gap-1 bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Client-side Audio Extraction (Cost ฿0)
            </span>
          </div>
        </section>

        {/* Engine & Provider Settings */}
        <section>
          <ProviderSelector />
        </section>

        {/* Upload & Processing Area */}
        <section>
          <UploadZone />
        </section>

        {/* Features / Value Proposition */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-zinc-900">
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200">สกัดเสียงไว ไม่เปลืองเน็ต</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              สกัดไฟล์วิดีโอ 1GB ให้เหลือ MP3 15MB บนเครื่องของคุณก่อนส่งไปถอดเสียง ประหยัดแบนด์วิดท์ 100%
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200">Preset สไตล์ & ฟอนต์สวย</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              เลือกสไตล์สำเร็จรูป ปรับแต่งฟอนต์ สี เงา ขนาด พร้อมฟอนต์ไทยพรีเมียมลิขสิทธิ์ถูกต้อง
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200">Export หลากหลาย</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Export เป็น FCPXML สำหรับ Final Cut Pro, XML สำหรับ Premiere, SRT หรือ Burn MP4 ความละเอียดสูง
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-400 bg-zinc-950">
        <p>SUBTHAITLE • Powered by Groq Whisper & Next.js 15 • Built with ❤️ for Content Creators</p>
      </footer>
    </div>
  );
}
