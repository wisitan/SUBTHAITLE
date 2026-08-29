'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Sparkles, Crown, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');
  const { refreshProfile, tier } = useAuth();

  useEffect(() => {
    // Refresh user profile to fetch newly upgraded tier
    refreshProfile();
    const timer = setTimeout(() => {
      refreshProfile();
    }, 2000);
    return () => clearTimeout(timer);
  }, [refreshProfile]);

  const isPro = tierParam === 'tier_299' || tier === 'tier_299';

  return (
    <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#181824] border border-amber-500/40 shadow-2xl text-center space-y-6 overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950 flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25 animate-bounce">
        {isPro ? <Crown className="w-9 h-9" /> : <Sparkles className="w-9 h-9" />}
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          ชำระเงินผ่าน PromptPay สำเร็จแล้ว
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white">
          ขอบคุณสำหรับการสนับสนุนค่ะ! ❤️
        </h2>

        <p className="text-sm text-zinc-300 leading-relaxed">
          ระบบได้อัปเกรดสถานะบัญชีของคุณเป็น{' '}
          <strong className="text-amber-300 font-bold">
            {isPro ? 'Pro Creator (299฿)' : 'Supporter (99฿)'}
          </strong>{' '}
          เรียบร้อยแล้วค่ะ สิทธิ์การใช้งานทั้งหมดถูกปลดล็อกให้คุณทันที!
        </p>
      </div>

      <div className="pt-2 space-y-3">
        <Link
          href="/"
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
        >
          <span>เริ่มสร้าง Subtitle ได้เลย</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/editor"
          className="w-full block py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          กลับสู่หน้าแก้ไขซับไตเติล (Open Editor)
        </Link>
      </div>
    </div>
  );
}

export default function DonateSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            <span>กำลังโหลด...</span>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
