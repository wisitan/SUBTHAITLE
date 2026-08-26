'use client';

import React from 'react';
import { Header } from '@/components/header';
import { ProviderSelector } from '@/components/provider-selector';
import { UploadZone } from '@/components/upload-zone';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
        {/* Clean Hero Section */}
        <section className="text-center space-y-3 max-w-2xl mx-auto pt-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            สร้าง Subtitle ภาษาไทย <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              อัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            ถอดเสียงภาษาไทยด้วย AI แม่นยำระดับคำ จัดเว้นวรรคและตัดคำอย่างเป็นธรรมชาติ พร้อมส่งออกเป็น FCPXML, SRT หรือฝังซับลงวิดีโอ MP4 ได้ทันที
          </p>
        </section>

        {/* Engine & Provider Settings */}
        <section>
          <ProviderSelector />
        </section>

        {/* Upload & Processing Area */}
        <section>
          <UploadZone />
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
        <p>SUBTHAITLE • AI Thai Caption Studio for Content Creators</p>
      </footer>
    </div>
  );
}
