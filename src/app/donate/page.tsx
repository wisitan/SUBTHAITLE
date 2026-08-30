'use client';

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/context/auth-context';
import {
  Heart,
  Zap,
  Check,
  Crown,
  Coffee,
  ShieldCheck,
  Layers,
  Loader2,
  LogIn,
  MessageSquareQuote,
} from 'lucide-react';

export default function DonatePage() {
  const { user, tier, isPaid, isPro, signInWithGoogle } = useAuth();
  const [loadingTier, setLoadingTier] = useState<'tier_99' | 'tier_299' | null>(null);

  const handleCheckout = async (targetTier: 'tier_99' | 'tier_299') => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setLoadingTier(targetTier);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: targetTier,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'ไม่สามารถสร้างรายการชำระเงินได้');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Header Hero */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm font-bold shadow-sm">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
            <span>ร่วมสนับสนุนผู้พัฒนา • จ่ายครั้งเดียวใช้งานตลอดชีพ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ปลดล็อกขีดจำกัด AI Subtitle <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              เพื่อประสบการณ์สร้างคอนเทนต์ระดับโปร
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            ระบบของเราเปิดให้ใช้งานฟรีตามโควต้าต่อวันเหมือนเดิม ทุกการสนับสนุนจะช่วยเป็นค่าเซิร์ฟเวอร์และพัฒนาฟีเจอร์ใหม่ๆ ให้ดียิ่งขึ้นค่ะ
          </p>

          {!user && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-orange-500/40 text-orange-300 text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-orange-400" />
                <span>เข้าสู่ระบบด้วย Google เพื่อบันทึกสิทธิ์ตลอดชีพ</span>
              </button>
            </div>
          )}
        </section>

        {/* Creator Story & Vision Section */}
        <section className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-700/80 shadow-xl relative overflow-hidden backdrop-blur-sm space-y-5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-md">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                เรื่องราวจากใจผู้พัฒนา
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                SUBTHAITLE เกิดขึ้นเพราะเราเจอปัญหาเดียวกับคุณ
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            <p>
              เรารู้ดีว่าการทำ Content หนึ่งชิ้นไม่ได้จบแค่ตอนถ่ายเสร็จ ยังมีทั้งการตัดต่อ ทำ Subtitle จัดคำ เว้นวรรค แก้คำผิด และปรับให้ซับออกมาสวยและอ่านง่าย ซึ่งเป็นงานเล็ก ๆ ที่กลับกินเวลาชีวิตของ Creator ไปไม่น้อย
            </p>
            <p>
              เราเองก็เจอปัญหานี้เหมือนกัน จึงเริ่มสร้าง SUBTHAITLE ขึ้นมาเพื่อใช้เอง และเมื่อทำไปเรื่อย ๆ เราก็คิดว่า ถ้ามันช่วยประหยัดเวลาของเราได้ ก็น่าจะแบ่งปันให้ Creator คนอื่น ๆ ที่กำลังเจอปัญหาเดียวกันได้ใช้ด้วย
            </p>
            <p>
              เราเข้าใจดีว่า Creator ทุกคนมีต้นทุนที่ต้องแบกรับอยู่แล้ว ทั้งกล้อง ไมโครโฟน คอมพิวเตอร์ ซอฟต์แวร์ เพลง ฟุตเทจ และค่าใช้จ่ายอีกมากมาย เราเองก็ไม่อยากให้ Subtitle กลายเป็นอีกหนึ่งค่าใช้จ่ายที่ต้องจ่ายทุกเดือน
            </p>
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
              <p className="text-white font-bold text-sm sm:text-base">
                SUBTHAITLE จึงถูกสร้างขึ้นด้วยแนวคิดง่าย ๆ ว่า
              </p>
              <p className="text-amber-300 font-semibold text-base">
                &ldquo;อยากให้ทุกคนเข้าถึงเครื่องมือคุณภาพดีได้โดยไม่ต้องกังวลกับค่าสมาชิกรายเดือน&rdquo;
              </p>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                คุณสามารถใช้งานได้ฟรี และหากอยากช่วยให้โปรเจกต์นี้เดินหน้าต่อ สามารถร่วมสนับสนุนทีมผู้พัฒนา เพียงครั้งเดียว และใช้งานได้ไม่จำกัด โดยเงินสนับสนุนจะช่วยเราในเรื่องของ ค่าไฟ ค่า Server ค่าใช้บริการต่าง ๆ และค่าใช้จ่ายในการพัฒนาฟีเจอร์ใหม่ ๆ
              </p>
            </div>
            <p>
              เราไม่ได้ตั้งใจสร้าง SUBTHAITLE ขึ้นมาเพื่อให้เป็นธุรกิจที่ต้องทำกำไรจาก Creator ทุกคน แต่อยากสร้างเครื่องมือดี ๆ ที่ช่วยให้คนทำ Content มีเวลาเหลือไปทำสิ่งที่สำคัญกว่า
            </p>
            <p>
              และสำหรับทุกคนที่ร่วมสนับสนุน เราอยากตอบแทนด้วย Subtitle Preset สวย ๆ พร้อมฟอนต์ Premium ที่เราใช้งานอย่างถูกลิขสิทธิ์ เพื่อให้คุณนำไปใช้สร้างงานของตัวเองได้ทันที
            </p>
            <p className="text-zinc-200">
              ขอบคุณที่ช่วยให้เครื่องมือเล็ก ๆ ที่เริ่มต้นจากการแก้ปัญหาของเรา ได้กลายเป็นเครื่องมือที่ช่วย Creator คนอื่น ๆ ได้ด้วย
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center">
            <span className="text-sm sm:text-base font-bold text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text">
              ✨ สร้างเพื่อใช้เอง • แบ่งปันให้ทุกคน • และเติบโตไปด้วยกัน
            </span>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Supporter Tier (99฿) */}
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
              tier === 'tier_99'
                ? 'border-orange-500/80 bg-orange-500/5 ring-1 ring-orange-500/30'
                : 'border-zinc-700 bg-zinc-900 shadow-xl hover:border-zinc-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-xs font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                  ✨ ยอดนิยม
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Supporter ☕</h3>
              <p className="text-sm text-zinc-300 mb-4">สำหรับ Creator ทั่วไปที่ต้องการปลดล็อก BYOK และบันทึกสไตล์ส่วนตัว</p>

              <div className="flex flex-col mb-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">฿99</span>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                    จ่ายครั้งเดียวผ่าน PromptPay
                  </span>
                </div>
                <span className="text-xs text-zinc-400 mt-1">ปลดล็อกทันทีหลังสแกนจ่ายเงิน</span>
              </div>

              {/* Benefits list */}
              <ul className="space-y-3 text-sm text-zinc-200">
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>
                    โควต้า API เซิร์ฟเวอร์ระบบเพิ่มเป็น <strong className="text-white">5 คลิป / วัน</strong> (จากเดิม 3)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span>
                    ปลดล็อก <strong className="text-emerald-400">Custom API Key (BYOK)</strong> ยิงตรงไม่จำกัดขนาดไฟล์และความยาวคลิป
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span>
                    บันทึก <strong className="text-white">Custom Presets ได้สูงสุด 5 แบบ</strong> ซิงค์บน Cloud อัตโนมัติ
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span>ปลดล็อกโหมด Local Whisper ในเครื่อง Mac / PC</span>
                </li>
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <button
                type="button"
                disabled={loadingTier !== null || isPaid}
                onClick={() => handleCheckout('tier_99')}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  tier === 'tier_99'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 shadow-lg shadow-orange-500/20'
                }`}
              >
                {loadingTier === 'tier_99' ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <Coffee className="w-4.5 h-4.5" />
                    <span>{tier === 'tier_99' ? '✓ คุณเป็นสมาชิก Supporter แล้ว' : isPro ? 'คุณอยู่ในระดับ Pro Creator' : 'สนับสนุน 99 บาท (PromptPay)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pro Creator Tier (299฿) */}
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
              tier === 'tier_299'
                ? 'border-amber-500/80 bg-amber-500/5 ring-1 ring-amber-500/30'
                : 'border-amber-500/40 bg-zinc-900 shadow-xl hover:border-amber-400'
            }`}
          >
            {/* Top highlight ribbon */}
            <div className="absolute -top-3 right-6 px-3.5 py-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-zinc-950 font-black text-xs rounded-full shadow-lg">
              👑 แนะนำสำหรับ Creator (ฟอนต์พรีเมียม)
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Crown className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                  ✨ จัดเต็มทุกฟีเจอร์
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Pro Creator 👑</h3>
              <p className="text-sm text-zinc-300 mb-4">สำหรับ Creator มืออาชีพที่ต้องการความยืดหยุ่นสูงสุดและฟอนต์พรีเมียม</p>

              <div className="flex flex-col mb-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">฿299</span>
                  <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                    จ่ายครั้งเดียวผ่าน PromptPay
                  </span>
                </div>
                <span className="text-xs text-zinc-400 mt-1">ปลดล็อกถาวรตลอดชีพ</span>
              </div>

              {/* Benefits list */}
              <ul className="space-y-3 text-sm text-zinc-200">
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span><strong>ได้รับทุกสิทธิประโยชน์ในระดับ Supporter 99฿</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span>
                    ปลดล็อกสิทธิ์ <strong className="text-amber-300">Export & Burn ฟอนต์ไทยพรีเมียม (👑 PRO)</strong> ทั้งหมด
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span>บันทึก Custom Presets ส่วนตัวได้จุใจถึง <strong className="text-white">20 แบบ</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span>โควต้าระบบ 5 คลิป/วัน และปลดล็อกโหมด BYOK ไม่จำกัด</span>
                </li>
              </ul>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <button
                type="button"
                disabled={loadingTier !== null || isPro}
                onClick={() => handleCheckout('tier_299')}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isPro
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                }`}
              >
                {loadingTier === 'tier_299' ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4.5 h-4.5" />
                    <span>{isPro ? '✓ คุณอยู่ในระดับ Pro Creator แล้ว' : 'ปลดล็อก Pro Creator 299 บาท'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Transparency Note */}
        <section className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-sm text-zinc-300 space-y-2">
          <p className="font-bold text-zinc-100 flex items-center gap-1.5 text-sm">
            <Heart className="w-4 h-4 text-rose-400" />
            คำชี้แจงจากใจทีมพัฒนา
          </p>
          <p className="leading-relaxed">
            • สิทธิ์การถอดเสียงฟรีตามโควตายังคงเปิดให้ทุกคนใช้งานได้ตลอดไปโดยไม่มีค่าใช้จ่ายค่ะ <br />
            • ทุกการสนับสนุนเป็นแบบ <strong>One-Time Community Donation (สนับสนุนครั้งเดียว)</strong> ไม่มีการคิดเงินรายเดือน
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
