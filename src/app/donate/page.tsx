'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
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
  Infinity as InfinityIcon,
  Ban,
  Gift,
} from 'lucide-react';

export default function DonatePage() {
  const { tier, setTier } = useAppStore();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-10">
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

        {/* 1. The Full Creator Story (Open Letter) */}
        <section className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-6 sm:p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
              <span>เรื่องราวเบื้องหลัง SUBTHAITLE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              เราเริ่มทำ SUBTHAITLE เพราะเราเองก็เป็น <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
                Content Creator
              </span>
            </h1>

            <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                เรารู้ดีว่าการทำคอนเทนต์หนึ่งชิ้นไม่ได้จบแค่ตอนถ่ายเสร็จ แต่ยังมีทั้งการตัดต่อ ทำ Subtitle จัดคำ เว้นวรรค และปรับให้ซับออกมาสวยและอ่านง่าย ซึ่งบางครั้งใช้เวลามากกว่าที่คิด
              </p>
              <p>
                เราเลยสร้าง SUBTHAITLE ขึ้นมาเพื่อใช้แก้ปัญหานี้ให้ตัวเอง และอยากแบ่งปันให้ Creator คนอื่น ๆ ที่กำลังเจอปัญหาเดียวกันได้ใช้งานด้วย
              </p>
              <p>
                เราเชื่อว่า Creator ทุกคนมีต้นทุนที่ต้องแบกรับอยู่แล้ว ทั้งอุปกรณ์ ซอฟต์แวร์ เพลง ฟุตเทจ และค่าใช้จ่ายอีกมากมาย เราจึงอยากให้เครื่องมือนี้ <strong className="text-white font-semibold">เข้าถึงง่ายและร่วมสนับสนุนเพียงครั้งเดียว ใช้งานได้ตลอดไป โดยไม่ต้องกังวลกับค่าสมาชิกรายเดือน</strong>
              </p>
              <p>
                ทุกการสนับสนุนจากคุณ ไม่ว่าจะเป็นการร่วมสนับสนุนค่าน้ำ ค่าไฟ หรือการบอกต่อ ล้วนช่วยเป็นค่าเซิร์ฟเวอร์ และค่าใช้จ่ายในการพัฒนาฟีเจอร์ใหม่ ๆ รวมถึงเป็นกำลังใจเล็ก ๆ ให้ทีมของเราทำ SUBTHAITLE ให้ดีขึ้นต่อไป
              </p>
              <p>
                และเพื่อเป็นการขอบคุณ เราตั้งใจเตรียม Subtitle Preset สวย ๆ พร้อมฟอนต์ Premium ที่เราใช้งานอย่างถูกลิขสิทธิ์ มอบเป็นของขวัญแถมให้ทุกคนได้นำไปใช้กับงานของตัวเองได้เลย
              </p>
              <p className="text-amber-300 font-semibold italic pt-1">
                &ldquo;เพราะเราเชื่อว่า เครื่องมือดี ๆ สำหรับ Creator ไม่ควรเป็นสิ่งที่ต้องจ่ายแพงเสมอไป&rdquo;
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
              <span>ด้วยความรักและเข้าใจในคนทำคอนเทนต์ ❤️</span>
              <span className="font-semibold text-zinc-400">— ทีมงาน SUBTHAITLE</span>
            </div>
          </div>
        </section>

        {/* 2. Big Bold One-Time Value Callout (Instadoodle Style) */}
        <section className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 via-rose-500/20 to-amber-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold shadow-lg shadow-orange-500/10">
            <InfinityIcon className="w-4 h-4 text-orange-400" />
            <span>ร่วมสนับสนุนครั้งเดียว ปลดล็อกตลอดชีพ (One-Time Support)</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            ไม่มีระบบสมาชิก • ไร้ค่าบริการรายเดือน
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            เลือกของขวัญสนับสนุนตามกำลัง เพื่อเป็นกำลังใจให้ทีมงาน พร้อมรับสิทธิประโยชน์และ Preset ฟอนต์สวยทันที
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-zinc-300">
            <span className="flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <Ban className="w-3.5 h-3.5 text-rose-400" /> ไม่มีผูกมัดบัตรเครดิต
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <InfinityIcon className="w-3.5 h-3.5 text-emerald-400" /> ใช้งานสิทธิประโยชน์ได้ตลอดไป
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <Gift className="w-3.5 h-3.5 text-amber-400" /> ของขวัญฟอนต์ลิขสิทธิ์แท้
            </span>
          </div>
        </section>

        {/* 3. Donation Cards (99฿ & 299฿) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coffee Tier (99฿) */}
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
                <span className="px-3 py-1 text-[11px] font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                  ⚡ สนับสนุนครั้งเดียว
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">เลี้ยงกาแฟ 1 แก้ว ☕</h3>
              <p className="text-xs text-zinc-400 mb-4">สำหรับ Creator ทั่วไปที่ต้องการความคล่องตัว</p>

              <div className="flex flex-col mb-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">฿99</span>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    จ่ายครั้งเดียวจบ
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 mt-1">ร่วมสนับสนุนเป็นค่าน้ำ ค่าไฟ ให้ทีมงาน</span>
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
                  <span>ของแถม: Preset ซับไตเติลสำเร็จรูป <strong>3 แบบ</strong></span>
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
                  alert('ขอบคุณที่ร่วมสนับสนุนค่าน้ำค่าไฟค่ะ! ปลดล็อกสถานะเลี้ยงกาแฟ (99฿) ให้เรียบร้อยแล้วค่ะ ❤️');
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tier === 'coffee'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 shadow-lg shadow-orange-500/20'
                }`}
              >
                <Coffee className="w-4 h-4" />
                <span>{tier === 'coffee' ? 'กำลังใช้งานสถานะนี้' : 'ร่วมสนับสนุน 99 บาท (เลี้ยงกาแฟ)'}</span>
              </button>
            </div>
          </div>

          {/* Meal Tier (299฿) */}
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
              tier === 'meal'
                ? 'border-rose-500/80 bg-rose-500/5 ring-1 ring-rose-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            {/* Top highlight ribbon */}
            <div className="absolute -top-3 right-6 px-3.5 py-1 bg-gradient-to-r from-rose-500 via-amber-400 to-orange-500 text-zinc-950 font-black text-[10px] rounded-full shadow-lg">
              👑 คุ้มค่าที่สุด (ของแถมฟอนต์พรีเมียม)
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Crown className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-[11px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                  ✨ สนับสนุนครั้งเดียว
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">เลี้ยงข้าวมื้ออร่อย 🍚</h3>
              <p className="text-xs text-zinc-400 mb-4">สำหรับ Creator มืออาชีพที่ต้องการฟอนต์ลิขสิทธิ์สวยพิเศษ</p>

              <div className="flex flex-col mb-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">฿299</span>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    จ่ายครั้งเดียวจบ
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 mt-1">สนับสนุนเป็นค่าเซิร์ฟเวอร์และพัฒนาฟีเจอร์</span>
              </div>

              {/* Benefits list */}
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span><strong>ได้รับทุกสิทธิประโยชน์ในระดับ 99฿</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span>
                    ของแถมพิเศษ: <strong>Preset สวยระดับสตูดิโอ 10 แบบ</strong> พร้อม{' '}
                    <strong className="text-amber-300 underline underline-offset-2">ฟอนต์ไทยพรีเมียมลิขสิทธิ์ถูกต้อง (Commercial Use)</strong>
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
                  <span>Burn Subtitle ลง MP4 ด้วยฟอนต์พรีเมียมได้ทันที คมชัดระดับโปร</span>
                </li>
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setTier('meal');
                  alert('ขอบคุณสำหรับการสนับสนุนอันยิ่งใหญ่ค่ะ! ปลดล็อกสถานะเลี้ยงข้าว (299฿) และฟอนต์พรีเมียมให้เรียบร้อยแล้วค่ะ ❤️');
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tier === 'meal'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 hover:from-rose-400 hover:to-amber-400 text-zinc-950 shadow-lg shadow-rose-500/20'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>{tier === 'meal' ? 'กำลังใช้งานสถานะนี้' : 'ร่วมสนับสนุน 299 บาท (เลี้ยงข้าว)'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4. Transparency Note */}
        <section className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-xs text-zinc-400 space-y-1.5">
          <p className="font-bold text-zinc-200 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            คำชี้แจงจากใจทีมพัฒนา
          </p>
          <p>
            • สิทธิ์การถอดเสียงฟรี 5 คลิป/วัน ยังคงเปิดให้ Creator ทุกคนใช้งานได้ตลอดไปโดยไม่มีค่าใช้จ่ายค่ะ <br />
            • ทุกการสนับสนุนเป็นแบบ <strong>One-Time Community Donation (สนับสนุนครั้งเดียว)</strong> เพื่อร่วมพัฒนาคอมมูนิตี้ ไม่มีการสมัครสมาชิกรายเดือน
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
