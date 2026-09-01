'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ArrowRight, CheckCircle2, Loader2, Coins } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const packageId = searchParams.get('packageId') || searchParams.get('tier');
  const { refreshProfile, profile } = useAuth();

  useEffect(() => {
    // 1. Verify session directly with server & Stripe (Instant Double-Safety Guarantee)
    if (sessionId) {
      fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(() => refreshProfile())
        .catch((err) => console.warn('[Verify Session Client Error]:', err));
    }

    // 2. Poll refresh user profile to ensure Realtime / Webhook updates reflect
    refreshProfile();
    const t1 = setTimeout(() => refreshProfile(), 1000);
    const t2 = setTimeout(() => refreshProfile(), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [sessionId, refreshProfile]);

  let packageName = 'เครดิตถอดเสียงภาษาไทย';
  if (packageId === 'credit_59') packageName = 'Mini (+45 นาที)';
  else if (packageId === 'credit_99') packageName = 'Starter (+90 นาที / 1.5 ชั่วโมง)';
  else if (packageId === 'credit_199') packageName = 'Creator (+240 นาที / 4 ชั่วโมง)';
  else if (packageId === 'credit_399') packageName = 'Pro Studio (+600 นาที / 10 ชั่วโมง)';
  else if (packageId === 'credit_249') packageName = 'Creator (+180 นาที)';
  else if (packageId === 'credit_599') packageName = 'Pro Studio (+480 นาที)';

  return (
    <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#181824] border border-amber-500/40 shadow-2xl text-center space-y-6 overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950 flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25 animate-bounce">
        <Coins className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          ชำระเงินสำเร็จแล้ว
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white">
          เติมเครดิตสำเร็จเรียบร้อยค่ะ! 🎉
        </h2>

        <p className="text-sm text-zinc-300 leading-relaxed">
          ระบบได้เพิ่มแพ็กเกจ{' '}
          <strong className="text-amber-300 font-bold">
            {packageName}
          </strong>{' '}
          เข้าสู่บัญชีของคุณเรียบร้อยแล้วค่ะ เครดิตคงเหลือ{' '}
          <strong className="text-emerald-400 font-bold">
            {profile?.credits_minutes || 0} นาที
          </strong>{' '}
          พร้อมใช้งานได้ทันที ไม่มีวันหมดอายุค่ะ!
        </p>
      </div>

      <div className="pt-2 space-y-3">
        <Link
          href="/"
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
        >
          <span>เริ่มสร้าง Subtitle ได้เลย</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/editor"
          className="w-full block py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          กลับสู่หน้าแก้ไขซับไตเติล (Open Editor)
        </Link>
      </div>
    </div>
  );
}

export default function CreditTopupSuccessPage() {
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
