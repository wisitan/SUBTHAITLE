'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProviderSelector } from '@/components/provider-selector';
import { UploadZone } from '@/components/upload-zone';
import { RecentProjects } from '@/components/recent-projects';
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
        <section className="text-center space-y-4 max-w-2xl mx-auto pt-2 sm:pt-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            สร้าง Subtitle ภาษาไทย <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              อัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-200 max-w-xl mx-auto leading-relaxed">
            ถอดเสียงภาษาไทยด้วย <span className="text-white font-bold bg-orange-500/20 px-1.5 py-0.5 rounded-md border border-orange-500/30">AI แม่นยำระดับคำ</span> จัดเว้นวรรคและตัดคำอย่างเป็นธรรมชาติ พร้อมส่งออกเป็น <span className="text-amber-300 font-semibold underline underline-offset-4 decoration-amber-500/40">FCPXML, XML, SRT</span> หรือ <span className="text-rose-300 font-semibold">ฝังซับวิดีโอ MP4</span> ได้ทันที
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

        {/* Recent Cloud Projects (Canva-Style) */}
        <section>
          <RecentProjects />
        </section>

        {/* Creator Story Teaser Section */}
        <section className="mt-4 p-5 sm:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-md">
              <MessageSquareQuote className="w-6 h-6" />
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                  Story จากทีมผู้พัฒนา
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                &ldquo;เราเริ่มทำ SUBTHAITLE เพราะเราเองก็เป็น Content Creator... ที่เบื่อการจ่ายรายเดือน&rdquo;
              </h3>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                SUBTHAITLE เกิดจากปัญหาที่เราเจอด้วยตัวเอง — การทำ Subtitle ที่สวย อ่านง่าย จัดคำและ ทำ Word Highlight ให้ถูกต้องนั้นกินเวลาชีวิตมาก และ Creator ทุกคนก็มีต้นทุนมากมายที่ต้องแบกรับอยู่แล้ว เราจึงอยากสร้างเครื่องมือนี้ขึ้นมาเพื่อแบ่งปัน<strong className="text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">ให้ทุกคนได้ใช้งาน ฟรี โดยไม่ต้องมีค่าสมาชิกรายเดือน</strong> และสำหรับใครที่อยากช่วยสนับสนุน สามารถร่วม Donate ได้เพียงครั้งเดียว เพื่อช่วยเป็นค่าไฟ ค่า Server และค่าพัฒนาฟีเจอร์ใหม่ ๆ ให้ SUBTHAITLE อยู่ต่อและพัฒนาไปด้วยกัน
              </p>

              <div className="pt-2">
                <Link
                  href="/donate"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base font-bold text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500/60 px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
                  <span>อ่านเรื่องราวฉบับเต็ม & ร่วมสนับสนุน</span>
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
