'use client';

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/context/auth-context';
import { useAppStore } from '@/lib/store';
import {
  Check,
  Crown,
  Coffee,
  Loader2,
  MessageSquareQuote,
  Coins,
  Flame,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CreditPackage {
  id: 'credit_59' | 'credit_99' | 'credit_199' | 'credit_399';
  name: string;
  price: number;
  minutes: number;
  hoursDisplay: string;
  estimatedClips: string;
  popular?: boolean;
  tag?: string;
  icon: typeof Coffee;
  description: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credit_59',
    name: 'Mini',
    price: 59,
    minutes: 45,
    hoursDisplay: '45 นาที',
    estimatedClips: '~30 คลิป',
    icon: Coffee,
    description: 'เหมาะสำหรับทดลองใช้ หรือทำคลิปสั้นทั่วไป 20-30 คลิป',
  },
  {
    id: 'credit_99',
    name: 'Starter',
    price: 99,
    minutes: 90,
    hoursDisplay: '1.5 ชั่วโมง',
    estimatedClips: '~70 คลิป',
    icon: Zap,
    description: 'เหมาะสำหรับครีเอเตอร์ทำคลิปลงประจำสัปดาห์ คุ้มค่าสบายกระเป๋า',
  },
  {
    id: 'credit_199',
    name: 'Creator',
    price: 199,
    minutes: 240,
    hoursDisplay: '4 ชั่วโมง',
    estimatedClips: '~200 คลิป',
    popular: true,
    tag: '🔥 ยอดนิยมที่สุด',
    icon: Flame,
    description: 'สุดคุ้มสำหรับสาย TikTok, Reels, Shorts ทำคอนเทนต์ทุกวันแบบจุใจ',
  },
  {
    id: 'credit_399',
    name: 'Pro Studio',
    price: 399,
    minutes: 600,
    hoursDisplay: '10 ชั่วโมง',
    estimatedClips: '~500 คลิป',
    tag: '⚡ คุ้มค่าสูงสุด',
    icon: Crown,
    description: 'สำหรับสตูดิโอ เอเจนซี่ พอดแคสต์ และสายคลิปยาว YouTube จัดเต็ม',
  },
];

export default function CreditTopupPage() {
  const { user, signInWithGoogle } = useAuth();
  const { creditsMinutes } = useAppStore();

  const [selectedPackageId, setSelectedPackageId] = useState<string>('credit_199');
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const handleBuyCredits = async (pkg: CreditPackage) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setLoadingItem(pkg.id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          tier: pkg.id,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ชำระเงินได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200 font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs sm:text-sm font-semibold shadow-sm">
            <Coins className="w-4 h-4" />
            <span>เติมเครดิตการใช้งาน (Pay-as-you-go)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            เติมเครดิตนาทีถอดเสียง <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              ไม่มีวันหมดอายุ ใช้งานได้ทันที
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            เลือกแพ็กเกจเติมเครดิตตามที่ต้องการ ถอดเสียงคลิปความยาวเท่าไหร่ก็ได้ หักเครดิตตามความยาวจริงของคลิป ไม่ต้องจ่ายรายเดือน
          </p>

          {/* Current User Balance Banner */}
          {user && (
            <div className="inline-flex items-center gap-3 bg-zinc-900/90 border border-zinc-700/80 px-4 py-2 rounded-2xl text-xs sm:text-sm shadow-md mt-2">
              <span className="text-zinc-400">เครดิตปัจจุบันของคุณ:</span>
              <span className="text-orange-400 font-bold font-mono text-base flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {creditsMinutes} นาที
              </span>
            </div>
          )}
        </section>

        {/* 4 Credit Packages Grid */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {CREDIT_PACKAGES.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const Icon = pkg.icon;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    pkg.popular
                      ? 'border-orange-500 bg-gradient-to-b from-orange-500/15 via-zinc-900/90 to-zinc-950 shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/50'
                      : isSelected
                      ? 'border-amber-500/90 bg-zinc-900/90 shadow-lg'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80 shadow-md'
                  }`}
                >
                  {/* Popular / Best Value Tag */}
                  {pkg.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-zinc-950 text-[10px] sm:text-xs font-black tracking-wide shadow-md whitespace-nowrap">
                      {pkg.tag}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        {pkg.estimatedClips}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed min-h-[32px]">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Price & Minutes Display */}
                    <div className="pt-2 border-t border-zinc-800 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{pkg.price}</span>
                        <span className="text-sm font-bold text-zinc-400">บาท</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ได้ {pkg.minutes} นาที ({pkg.hoursDisplay})</span>
                      </div>
                    </div>

                    {/* Feature bullet list */}
                    <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>ถอดเสียงคลิปความยาวเท่าไรก็ได้</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>ไม่มีวันหมดอายุ สะสมได้เรื่อย ๆ</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Word Highlight & Export ครบ</span>
                      </li>
                    </ul>
                  </div>

                  {/* Buy Button */}
                  <div className="pt-6">
                    <button
                      type="button"
                      disabled={loadingItem === pkg.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyCredits(pkg);
                      }}
                      className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        pkg.popular
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {loadingItem === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังพาไปหน้าชำระเงิน...</span>
                        </>
                      ) : (
                        <>
                          <span>เติม {pkg.price} บาท</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ชำระเงินปลอดภัยผ่าน Stripe รองรับการสแกน QR พร้อมเพย์ (PromptPay) และบัตรเดบิต/เครดิต</span>
            </div>
            <span className="text-zinc-500 text-[11px]">ระบบเติมเครดิตเข้าบัญชีให้อัตโนมัติทันทีหลังชำระเงินสำเร็จ</span>
          </div>
        </section>

        {/* Creator Story & Philosophy */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ทำไมเราถึงคิดราคาแบบ Pay-as-you-go?</h3>
              <p className="text-xs text-zinc-400">จากใจทีมผู้พัฒนา SUBTHAITLE</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            เราสร้าง SUBTHAITLE ขึ้นมาเพราะเราเข้าใจดีว่าในฐานะ Content Creator ไม่มีใครอยากแบกรับค่าสมาชิกรายเดือนแพง ๆ ที่บางเดือนแทบไม่ได้ใช้งาน เราจึงออกแบบให้ทุกคนใช้งานได้ <strong className="text-amber-300">ฟรีวันละ 3 คลิป</strong> และหากมีช่วงไหนที่คุณต้องตัดคลิปยาวหรือทำคอนเทนต์จำนวนมาก คุณก็สามารถเติมเครดิตได้ในราคาที่เป็นมิตร เริ่มต้นเพียง 59 บาท โดยไม่มีวันหมดอายุค่ะ
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
