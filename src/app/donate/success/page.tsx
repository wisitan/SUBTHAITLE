'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ArrowRight, CheckCircle2, Loader2, Heart, Coffee } from 'lucide-react';

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

  let tierDisplayName = 'การร่วมสนับสนุนโครงการ';
  if (packageId === 'coffee_59' || packageId === 'credit_59') {
    tierDisplayName = 'เลี้ยงกาแฟทีมงาน (+60 นาที)';
  } else if (packageId === 'meal_99' || packageId === 'credit_99') {
    tierDisplayName = 'เลี้ยงข้าวทีมงาน (+120 นาที)';
  } else if (packageId === 'starbucks_199' || packageId === 'credit_199') {
    tierDisplayName = 'เลี้ยง Starbucks ทีมงาน (+300 นาที)';
  }

  return (
    <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#181824] border border-orange-500/40 shadow-2xl text-center space-y-6 overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-zinc-950 flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25 animate-bounce">
        <Heart className="w-8 h-8 fill-zinc-950" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          สนับสนุนสำเร็จแล้ว
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white">
          ขอบพระคุณมากนะคะ! 💖☕
        </h2>

        <p className="text-sm text-zinc-300 leading-relaxed">
          ทีมงานได้รับพลังใจจาก{' '}
          <strong className="text-amber-300 font-bold">
            {tierDisplayName}
          </strong>{' '}
          และได้เพิ่มโควต้าถอดเสียงขอบคุณเข้าสู่บัญชีของคุณเรียบร้อยแล้วค่ะ!
        </p>

        <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 inline-flex items-center gap-2 mt-1">
          <Coffee className="w-4 h-4 text-orange-400 shrink-0" />
          <span>โควต้าคงเหลือของคุณ:</span>
          <strong className="text-orange-400 font-mono text-sm font-bold">
            {profile?.credits_minutes || 0} นาที
          </strong>
        </div>
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

export default function DonateSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            <p className="text-xs text-zinc-400">กำลังยืนยันรายการสนับสนุน...</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
