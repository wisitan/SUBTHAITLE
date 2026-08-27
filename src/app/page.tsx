'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProviderSelector } from '@/components/provider-selector';
import { UploadZone } from '@/components/upload-zone';
import { Heart, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const loadDictionary = useAppStore((state) => state.loadDictionary);

  useEffect(() => {
    loadDictionary();
  }, [loadDictionary]);

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

          <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed">
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

        {/* Creator Story Teaser Section */}
        <section className="mt-4 p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <MessageSquareQuote className="w-5 h-5" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Story จากทีมผู้พัฒนา
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                &ldquo;เราเริ่มทำ SUBTHAITLE เพราะเราเองก็เป็น Content Creator...&rdquo;
              </h3>

              <p className="text-sm text-zinc-300 leading-relaxed">
                เรารู้ดีว่าการทำคอนเทนต์หนึ่งชิ้นไม่ได้จบแค่ตอนถ่ายเสร็จ แต่ยังมีทั้งการตัดต่อ ทำ Subtitle จัดคำ เว้นวรรค ที่กินเวลาชีวิตสุดๆ เราเชื่อว่า Creator ทุกคนมีต้นทุนที่ต้องแบกรับอยู่แล้ว เราจึงอยากให้ทุกคนเข้าถึงเครื่องมือนี้ได้ฟรี หรือร่วมสนับสนุนผู้พัฒนาเพียงครั้งเดียวเพื่อรับของแถมพิเศษตลอดชีพ โดยไม่ต้องมีค่าสมาชิกรายเดือน
              </p>

              <div className="pt-1">
                <Link
                  href="/donate"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-rose-200 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
                  <span>อ่านเรื่องราวฉบับเต็ม & ร่วมสนับสนุนทีมงาน</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer with Admin Trigger */}
      <Footer />
    </div>
  );
}
