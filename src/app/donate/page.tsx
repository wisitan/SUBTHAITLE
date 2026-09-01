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
  Key,
  Flame,
} from 'lucide-react';

interface CreditPackage {
  id: 'credit_99' | 'credit_249' | 'credit_599';
  name: string;
  price: number;
  minutes: number;
  hoursDisplay: string;
  perMinute: number;
  popular?: boolean;
  tag?: string;
  icon: typeof Coffee;
  description: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credit_99',
    name: 'Starter',
    price: 99,
    minutes: 60,
    hoursDisplay: '1 ชั่วโมง',
    perMinute: 1.65,
    icon: Coffee,
    description: 'เหมาะสำหรับทดลองใช้ หรือทำคลิปสั้นทั่วไป ~60 คลิป',
  },
  {
    id: 'credit_249',
    name: 'Creator',
    price: 249,
    minutes: 180,
    hoursDisplay: '3 ชั่วโมง',
    perMinute: 1.38,
    popular: true,
    tag: '🔥 ยอดนิยมที่สุด',
    icon: Flame,
    description: 'สุดคุ้มสำหรับคอนเทนต์ครีเอเตอร์ ได้เครดิตจุใจ ~180 คลิป',
  },
  {
    id: 'credit_599',
    name: 'Pro Studio',
    price: 599,
    minutes: 480,
    hoursDisplay: '8 ชั่วโมง',
    perMinute: 1.25,
    icon: Crown,
    tag: '⚡ คุ้มค่าสูงสุด',
    description: 'สำหรับสตูดิโอและเอเจนซี่ ได้เครดิตจัดเต็ม ~480 คลิป',
  },
];

export function DonatePage() {
  const { user, signInWithGoogle } = useAuth();
  const { creditsMinutes, isLifetimeUnlocked } = useAppStore();

  const [selectedPackageId, setSelectedPackageId] = useState<string>('credit_249');
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
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงินผ่าน Stripe');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ชำระเงินได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoadingItem(null);
    }
  };

  const handleBuyLifetime = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setLoadingItem('lifetime_699');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: 'tier_699',
          tier: 'tier_699',
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงินผ่าน Stripe');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ชำระเงินได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-10">
        {/* Header Hero */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs sm:text-sm font-bold shadow-sm">
            <Coins className="w-4 h-4 text-orange-400" />
            <span>เติมเครดิตตามจริง • ไม่มีวันหมดอายุ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            แพ็กเกจเติมเครดิต & สิทธิ์ซื้อขาด <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              ถอดเสียงภาษาไทยด้วย AI แม่นยำระดับโปร
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            เลือกเติมเครดิตตามจำนวนนาทีที่ใช้งานจริง ไม่ผูกมัดรายเดือน หรือซื้อขาดตลอดชีพจ่ายครั้งเดียวจบ
          </p>

          {/* Current Balance Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 flex items-center gap-2 text-sm shadow-md">
              <span className="text-zinc-400">เครดิตของคุณตอนนี้:</span>
              <strong className="text-emerald-400 font-mono text-base">{creditsMinutes} นาที</strong>
            </div>

            {isLifetimeUnlocked && (
              <div className="px-4 py-2 rounded-2xl bg-purple-950/60 border border-purple-800/80 flex items-center gap-2 text-sm text-purple-300 shadow-md">
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="font-bold">ปลดล็อก Lifetime Pass แล้ว</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 1: Pay-as-you-go Credit Packages */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              1. เติมเครดิตตามจริง (Pay-as-you-go Credits)
            </h2>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full ml-auto">
              ✨ เครดิตไม่มีวันหมดอายุ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {CREDIT_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-orange-500/90 bg-orange-500/[0.07] ring-2 ring-orange-500/50 shadow-xl shadow-orange-500/15 md:-translate-y-1'
                      : 'border-zinc-700/80 bg-zinc-900/95 hover:border-zinc-500 hover:bg-zinc-900/90 shadow-lg'
                  }`}
                >
                  {pkg.tag && (
                    <div className="absolute -top-3 right-5 px-3 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-extrabold text-xs rounded-full shadow-md">
                      {pkg.tag}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-400">
                        ~{pkg.perMinute.toFixed(2)} ฿/นาที
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                    <p className="text-xs text-zinc-300 mb-4">{pkg.description}</p>

                    <div className="mb-5 pb-5 border-b border-zinc-800 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">฿{pkg.price}</span>
                        <span className="text-xs text-zinc-400">จ่ายครั้งเดียว</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black text-amber-400 font-mono leading-tight">
                          +{pkg.hoursDisplay}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-medium">
                          ({pkg.minutes} นาที)
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>ถอดเสียงด้วย <strong>Google Cloud AI</strong> แม่นยำสูงสุด</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>ตรวจทานคำผิดด้วย <strong>Gemini 3.7 Flash</strong> อัตโนมัติ</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>คลิปยาวเท่าไหร่ก็ได้</strong> หักตามเวลาจริง</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>เครดิตสะสมได้ <strong>ไม่มีวันหมดอายุ</strong></span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      disabled={loadingItem !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPackageId(pkg.id);
                        handleBuyCredits(pkg);
                      }}
                      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 shadow-orange-500/20 font-extrabold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {loadingItem === pkg.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-4 h-4" />
                          <span>เติม {pkg.price} บาท (+{pkg.minutes} นาที)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Lifetime Pass (699฿) */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              2. แพ็กเกจซื้อขาด (Lifetime Pass — จ่ายครั้งเดียวจบ 699฿)
            </h2>
            <span className="text-xs text-purple-400 font-semibold bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-full ml-auto">
              👑 ปลดล็อกตลอดชีพ
            </span>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-purple-950/40 via-zinc-900/90 to-zinc-900/90 border border-purple-500/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Lifetime BYOK & Local Pass
                  </h3>
                  <p className="text-xs sm:text-sm text-purple-300">
                    สำหรับ Power User และ Creator ที่มี API Key ของตัวเอง หรือต้องการความเป็นส่วนตัว 100%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-zinc-200">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>ปลดล็อก <strong>BYOK Mode</strong> ใส่ Google / OpenAI / Groq Key ไม่จำกัดตลอดชีพ</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>ปลดล็อก <strong>Local AI</strong> ถอดเสียงในเครื่อง Mac/PC ออฟไลน์ 100%</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>บันทึก <strong>Custom Presets ได้ 20 แบบ</strong> ซิงค์ Cloud</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>เข้าถึง <strong>คลังฟอนต์ไทยแท้ 29 แบบ</strong> ครบทุกสไตล์</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 flex flex-col items-center md:items-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800">
              <div className="text-center md:text-right">
                <span className="text-3xl sm:text-4xl font-black text-white">฿699</span>
                <p className="text-xs text-purple-300 font-semibold">จ่ายครั้งเดียว • ใช้งานตลอดชีพ</p>
              </div>

              <button
                type="button"
                disabled={loadingItem !== null || isLifetimeUnlocked}
                onClick={handleBuyLifetime}
                className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 ${
                  isLifetimeUnlocked
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
                }`}
              >
                {loadingItem === 'lifetime_699' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLifetimeUnlocked ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ ปลดล็อกสิทธิ์ตลอดชีพแล้ว</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>ปลดล็อก Lifetime Pass (฿699)</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
                SUBTHAITLE เกิดขึ้นเพราะเราเข้าใจต้นทุนของ Creator
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            <p>
              เราสร้าง SUBTHAITLE ขึ้นมาเพราะเราเองก็เป็น Creator ที่เบื่อการจ่ายรายเดือน ทุกการเติมเครดิตและซื้อขาดจะช่วยให้เรามีงบค่าไฟ ค่า Server และพัฒนาเครื่องมือให้ครีเอเตอร์ไทยทุกคนได้ใช้งานเครื่องมือที่ดีที่สุดต่อไปค่ะ
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default DonatePage;
