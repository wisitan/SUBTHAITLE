'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { useAppStore } from '@/lib/store';
import {
  Heart,
  Coffee,
  Sparkles,
  Check,
  Zap,
  ArrowLeft,
  Crown,
  Key,
  Palette,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export default function DonatePage() {
  const { tier, setTier } = useAppStore();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
        {/* Back navigation */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
            <span>สนับสนุนผู้พัฒนา (Community Support)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            เลี้ยงกาแฟ หรือ เลี้ยงข้าวน้อง <br />
            <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              เพื่อเป็นกำลังใจ & ปลดล็อกของแถมพิเศษ
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            SUBTHAITLE สร้างขึ้นเพื่อให้ Content Creator ไทยทุกคนได้ใช้งาน AI ถอดเสียงคุณภาพสูงฟรีทุกวัน{' '}
            การสนับสนุนของคุณช่วยเป็นค่าน้ำ ค่าไฟ และค่าพัฒนาฟีเจอร์ใหม่ๆ ค่ะ ❤️
          </p>
        </div>

        {/* Donation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* 1. Coffee Tier (99฿) */}
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
              tier === 'coffee'
                ? 'border-orange-500/80 bg-orange-500/5 ring-1 ring-orange-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <Coffee className="w-6 h-6" />
                </div>
                {tier === 'coffee' && (
                  <span className="px-2.5 py-1 text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full">
                    สถานะปัจจุบันของคุณ
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">เลี้ยงกาแฟ 1 แก้ว ☕</h3>
              <p className="text-xs text-zinc-400 mb-4">สำหรับ Creator ทั่วไปที่ต้องการความคล่องตัว</p>

              <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-zinc-800">
                <span className="text-3xl sm:text-4xl font-black text-white">฿99</span>
                <span className="text-xs text-zinc-400">/ สนับสนุนครั้งเดียว ตลอดชีพ</span>
              </div>

              {/* Benefits list */}
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span><strong>ไร้ป้ายแบนเนอร์</strong> รบกวนสายตา</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Key className="w-2.5 h-2.5" />
                  </div>
                  <span>ปลดล็อก <strong>BYOK Mode</strong> (ใส่ API Key ตัวเอง ถอดเสียงไม่จำกัดขนาด & เวลา)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-2.5 h-2.5" />
                  </div>
                  <span>ปลดล็อก <strong>Local Whisper Mode</strong> (รัน AI ในเครื่อง ปลอดภัย 100%)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Palette className="w-2.5 h-2.5" />
                  </div>
                  <span>Preset ซับไตเติลสำเร็จรูปสวยๆ <strong>3 แบบ</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-2.5 h-2.5" />
                  </div>
                  <span>บันทึก Custom Preset ของตัวเองได้ <strong>10 แบบ</strong></span>
                </li>
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setTier('coffee');
                  alert('ขอบคุณที่สนับสนุนค่ะ! ปลดล็อก Tier เลี้ยงกาแฟ (99฿) เรียบร้อยแล้ว');
                }}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  tier === 'coffee'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 shadow-lg shadow-orange-500/20'
                }`}
              >
                <Coffee className="w-4 h-4" />
                <span>{tier === 'coffee' ? 'กำลังใช้งานสถานะนี้' : 'สนับสนุน 99 บาท'}</span>
              </button>
            </div>
          </div>

          {/* 2. Meal Tier (299฿) */}
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
              tier === 'meal'
                ? 'border-rose-500/80 bg-rose-500/5 ring-1 ring-rose-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            {/* Top highlight ribbon */}
            <div className="absolute -top-3 right-6 px-3 py-0.5 bg-gradient-to-r from-rose-500 to-amber-500 text-zinc-950 font-extrabold text-[10px] rounded-full shadow-md">
              👑 คุ้มค่าที่สุด (Font พรีเมียม)
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Crown className="w-6 h-6" />
                </div>
                {tier === 'meal' && (
                  <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                    สถานะปัจจุบันของคุณ
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">เลี้ยงข้าวมื้ออร่อย 🍚</h3>
              <p className="text-xs text-zinc-400 mb-4">สำหรับ Creator มืออาชีพที่ต้องการฟอนต์ลิขสิทธิ์สวยพิเศษ</p>

              <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-zinc-800">
                <span className="text-3xl sm:text-4xl font-black text-white">฿299</span>
                <span className="text-xs text-zinc-400">/ สนับสนุนครั้งเดียว ตลอดชีพ</span>
              </div>

              {/* Benefits list */}
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span><strong>ได้รับทุกอย่างในระดับเลี้ยงกาแฟ (99฿)</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span>
                    แถมฟรี <strong>Preset สวยพิเศษ 10 แบบ</strong> ที่ใช้{' '}
                    <strong className="text-amber-300 underline underline-offset-2">ฟอนต์ไทยพรีเมียมลิขสิทธิ์แท้ (Commercial Use)</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-2.5 h-2.5" />
                  </div>
                  <span>บันทึก Custom Preset ส่วนตัวได้จุใจถึง <strong>30 แบบ</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                  </div>
                  <span>Burn Subtitle ลง MP4 ด้วยฟอนต์พรีเมียมได้ทันที 100% คมชัด</span>
                </li>
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setTier('meal');
                  alert('ขอบคุณสำหรับการสนับสนุนอันยิ่งใหญ่ค่ะ! ปลดล็อก Tier เลี้ยงข้าว (299฿) และฟอนต์พรีเมียมเรียบร้อยแล้ว');
                }}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  tier === 'meal'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 hover:from-rose-400 hover:to-amber-400 text-zinc-950 shadow-lg shadow-rose-500/20'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>{tier === 'meal' ? 'กำลังใช้งานสถานะนี้' : 'สนับสนุน 299 บาท'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Note / FAQ */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 space-y-2 mt-4">
          <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            คำชี้แจงความโปร่งใส
          </p>
          <p>
            • การใช้งานถอดเสียงฟรี 5 คลิป/วัน ยังคงมีให้สำหรับทุกคนตลอดไปโดยไม่มีวันหมดอายุค่ะ <br />
            • การสนับสนุนเป็นแบบ <strong>จ่ายครั้งเดียวใช้งานได้ตลอดชีพ</strong> ไม่มีการตัดบัตรรายเดือนแอบแฝง
          </p>
        </div>
      </main>
    </div>
  );
}
