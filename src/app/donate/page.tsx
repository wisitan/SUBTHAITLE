'use client';

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/context/auth-context';
import { useAppStore } from '@/lib/store';
import {
  Check,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  Loader2,
  Heart,
  Flame,
  ShieldCheck,
  Clock,
  ArrowRight,
  Server,
  Code2,
} from 'lucide-react';

interface DonateTier {
  id: 'coffee_59' | 'meal_99' | 'starbucks_199';
  name: string;
  price: number;
  minutes: number;
  hoursDisplay: string;
  estimatedClips: string;
  popular?: boolean;
  tag?: string;
  icon: typeof Coffee;
  description: string;
  perks: string[];
}

const DONATE_TIERS: DonateTier[] = [
  {
    id: 'coffee_59',
    name: 'เลี้ยงกาแฟทีมงาน',
    price: 59,
    minutes: 60,
    hoursDisplay: '60 นาที',
    estimatedClips: '~40 คลิป',
    icon: Coffee,
    description: 'ร่วมสนับสนุนค่าน้ำชากาแฟ เติมพลังให้ทีมพัฒนาปรับปรุง AI ไทยอย่างต่อเนื่อง',
    perks: [
      'รับโควต้าถอดเสียงขอบคุณ 60 นาที (1 ชั่วโมงเต็ม)',
      'ทำคลิปสั้น TikTok / Reels ได้ ~40 คลิป',
      'โควต้าไม่มีวันหมดอายุ ใช้ได้ตลอดไป',
      'เข้าถึง AI โมเดลภาษาไทย SCB 10X Typhoon SOTA',
    ],
  },
  {
    id: 'meal_99',
    name: 'เลี้ยงข้าวทีมงาน',
    price: 99,
    minutes: 120,
    hoursDisplay: '2 ชั่วโมง (120 นาที)',
    estimatedClips: '~90 คลิป',
    icon: UtensilsCrossed,
    description: 'ร่วมสมทบทุนค่าเซิร์ฟเวอร์ & GPU ประมวลผลถอดเสียงภาษาไทยให้ทำงานได้ 24 ชม.',
    perks: [
      'รับโควต้าถอดเสียงขอบคุณ 120 นาที (2 ชั่วโมงเต็ม)',
      'ทำคลิปสั้น TikTok / Reels ได้ ~90 คลิป',
      'โควต้าไม่มีวันหมดอายุ สะสมทบยอดได้เรื่อย ๆ',
      'เข้าถึง AI โมเดลภาษาไทย SCB 10X Typhoon SOTA',
      'เรนเดอร์ MP4 4K / 1080p คมชัดเต็มร้อย ฟรี 0 เครดิต',
    ],
  },
  {
    id: 'starbucks_199',
    name: 'เลี้ยง Starbucks ทีมงาน',
    price: 199,
    minutes: 300,
    hoursDisplay: '5 ชั่วโมงเต็ม (300 นาที)',
    estimatedClips: '~250 คลิป',
    popular: true,
    tag: '🔥 ผู้สนับสนุนยอดนิยม',
    icon: Flame,
    description: 'สุดยอดผู้สนับสนุนตัวจริง ช่วยค้ำจุนค่า Cloudflare R2, Cloud GPU และฟีเจอร์ใหม่ ๆ',
    perks: [
      'รับโควต้าถอดเสียงขอบคุณ 300 นาที (5 ชั่วโมงเต็ม)',
      'ทำคลิปสั้น TikTok / Reels / Shorts ได้ ~250 คลิป',
      'โควต้าไม่มีวันหมดอายุ สะสมทบยอดได้ตลอดไป',
      'เข้าถึง AI ทุกโมเดล (Typhoon, Whisper-1, Gemini 2.5)',
      'เรนเดอร์ MP4 4K / 1080p ไม่จำกัดจำนวนครั้ง',
      'ความคุ้มค่าสูงสุดสำหรับสายคอนเทนต์มืออาชีพ',
    ],
  },
];

export default function DonatePage() {
  const { user, signInWithGoogle } = useAuth();
  const { creditsMinutes } = useAppStore();

  const [selectedTierId, setSelectedTierId] = useState<string>('starbucks_199');
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const handleDonate = async (tier: DonateTier) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setLoadingItem(tier.id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: tier.id,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'ไม่สามารถสร้างรายการสนับสนุนได้');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Donate Checkout Error:', err);
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090e] text-white flex flex-col font-sans selection:bg-orange-500/30">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold shadow-inner">
            <Heart className="w-3.5 h-3.5 fill-orange-400" />
            <span>ร่วมสนับสนุนโครงการ SUBTHAITLE</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
            ร่วมสมทบทุนค่าเซิร์ฟเวอร์ & เลี้ยงกาแฟทีมงาน ☕
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            SUBTHAITLE เกิดจากความตั้งใจพัฒนาเครื่องมือ AI ซับไตเติลภาษาไทยคุณภาพสูง เพื่อช่วยประหยัดเวลาให้ครีเอเตอร์ไทยทุกคน
            การสนับสนุนของพี่ ๆ ทุกท่านช่วยต่อลมหายใจให้ค่า Cloud GPU, Server API และการพัฒนาฟีเจอร์ใหม่ ๆ ดำเนินต่อไปได้ค่ะ 💖
          </p>

          {/* Current Balance Pill */}
          {user && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 text-xs sm:text-sm text-zinc-300 shadow-md">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>โควต้าคงเหลือของคุณ:</span>
                <strong className="text-orange-400 font-mono text-base font-bold">
                  {creditsMinutes || 0} นาที
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* 3 Donation Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {DONATE_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTierId === tier.id;
            const isBusy = loadingItem === tier.id;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#151522] border-orange-500 ring-2 ring-orange-500/40 shadow-2xl shadow-orange-500/10 scale-[1.02]'
                    : 'bg-[#101018] border-zinc-800 hover:border-zinc-700 hover:bg-[#12121e]'
                }`}
              >
                {/* Popular Badge */}
                {tier.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold text-[11px] shadow-lg flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    <span>{tier.tag}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{tier.name}</h3>
                      <p className="text-xs text-zinc-400">{tier.estimatedClips}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="py-2 border-y border-zinc-800/80">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white">{tier.price}</span>
                      <span className="text-base font-bold text-orange-400">บาท</span>
                      <span className="text-xs text-zinc-400 ml-1">/ ครั้ง</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>รับโควต้าถอดเสียง {tier.hoursDisplay}</span>
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed">{tier.description}</p>

                  {/* Perks List */}
                  <ul className="space-y-2 pt-2">
                    {tier.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Action Button */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDonate(tier);
                    }}
                    disabled={Boolean(loadingItem)}
                    className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 shadow-orange-500/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังเชื่อมต่อ...</span>
                      </>
                    ) : (
                      <>
                        <span>ร่วมสนับสนุน {tier.price}฿</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Story & Transparency Banner */}
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">เงินสนับสนุนของท่านนำไปใช้อะไรบ้าง?</h3>
              <p className="text-xs text-zinc-400">โปร่งใส 100% เพื่อให้ระบบทำงานได้เสถียรและเร็วที่สุด</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-orange-400 font-bold">
                <Server className="w-4 h-4" />
                <span>ค่า Cloud GPU & Server</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                หล่อเลี้ยงระบบ API ถอดเสียง AI สปีดสูง (SCB 10X Typhoon, OpenAI Whisper) ตลอด 24 ชั่วโมง
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Cloudflare R2 Storage</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                บันทึก Proxy วิดีโอและโปรเจกต์งานซับไตเติลบนคลาวด์ ปลอดภัย เปิดดูข้ามอุปกรณ์ได้ตลอด 60 วัน
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Code2 className="w-4 h-4" />
                <span>ค่าน้ำชากาแฟทีมพัฒนา</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                เติมพลังให้ทีมงานอัปเดตฟอนต์ใหม่ พจนานุกรมคำศัพท์ไทย และฟีเจอร์เจ๋ง ๆ ตามคำเรียกร้อง
              </p>
            </div>
          </div>
        </div>

        {/* Security & Payment Notes */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-zinc-400 pt-2 text-center">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ชำระเงินปลอดภัยผ่าน Stripe (รองรับ PromptPay สแกน QR & บัตรเดบิต/เครดิต)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>โควต้าเข้าบัญชีอัตโนมัติทันทีหลังชำระสำเร็จ ไม่มีวันหมดอายุ</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
