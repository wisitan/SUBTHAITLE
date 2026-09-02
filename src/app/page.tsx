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
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">
        {/* Clean Hero Section */}
        <section className="text-center space-y-3 max-w-2xl mx-auto pt-1 sm:pt-2">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            สร้าง Subtitle ภาษาไทย <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              อัตโนมัติ สวยสะกดตา ไฮไลต์ทีละคำ
            </span>
          </h1>

          {/* 4-Step Process Indicator */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap text-xs sm:text-[13px] text-zinc-400 font-medium pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center">1</span>
              <span>อัปโหลดวิดีโอ</span>
            </span>
            <span className="text-zinc-600">→</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center">2</span>
              <span>AI ถอดเสียง</span>
            </span>
            <span className="text-zinc-600">→</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center">3</span>
              <span>เลือกสไตล์</span>
            </span>
            <span className="text-zinc-600">→</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-sm">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[10px] flex items-center justify-center">4</span>
              <span>เรนเดอร์</span>
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
                &ldquo;เราเริ่มทำ SUBTHAITLE เพราะเราเองก็เป็น Content Creator... ที่เบื่อกับระบบผูกมัดรายเดือน&rdquo;
              </h3>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                SUBTHAITLE เกิดจากปัญหาที่เราเจอด้วยตัวเอง — การทำซับไตเติลภาษาไทยที่สวย อ่านง่าย ตัดคำและทำ Word Highlight ให้ถูกต้องนั้นกินเวลาชีวิตมาก และ Creator ทุกคนก็มีต้นทุนเครื่องมือมากมายที่ต้องจ่ายอยู่แล้ว เราจึงอยากสร้างเครื่องมือนี้ขึ้นมาเพื่อแบ่งปัน<strong className="text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">ให้ทุกคนได้ใช้งานฟรีวันละ 5 คลิป โดยไม่มีค่าสมาชิกรายเดือน</strong> และหากวันไหนมีคลิปยาวหรือต้องการทำงานต่อเนื่อง ก็สามารถร่วมสนับสนุนเลี้ยงกาแฟทีมงานเพื่อรับโควต้าตามการใช้งานจริง (ไม่มีวันหมดอายุ) เพื่อช่วยเป็นค่าไฟ ค่า Server และพัฒนาฟีเจอร์ใหม่ ๆ ให้ SUBTHAITLE อยู่ต่อและพัฒนาไปด้วยกันครับ
              </p>

              <div className="pt-2">
                <Link
                  href="/donate"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base font-bold text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500/60 px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
                  <span>ร่วมเลี้ยงกาแฟทีมงาน ☕</span>
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
