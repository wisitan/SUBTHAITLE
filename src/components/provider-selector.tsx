'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import {
  Zap,
  Coins,
  Cpu,
  CheckCircle2,
  Plus,
  ArrowUpRight,
} from 'lucide-react';

export function ProviderSelector() {
  const {
    providerMode,
    setProviderMode,
    creditsMinutes,
    groqDailyUsageCount,
    maxGroqDailyQuota,
    syncQuotas,
  } = useAppStore();

  const { user } = useAuth();

  useEffect(() => {
    syncQuotas(user?.id);
  }, [user, syncQuotas]);

  const remainingDaily = Math.max(0, maxGroqDailyQuota - groqDailyUsageCount);
  const isFreeSelected = providerMode === 'free' || providerMode === 'groq_free' || providerMode === 'google_free';
  const isCreditsSelected = providerMode === 'credits';

  return (
    <div className="w-full max-w-full bg-zinc-900/95 border border-zinc-700/80 hover:border-zinc-500 rounded-3xl p-4 sm:p-6 shadow-xl overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400 shrink-0" />
            <span>เลือกโหมดการถอดเสียง & โควต้า (AI Engine & Quota)</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 mt-0.5 leading-relaxed">
            เลือกใช้งานโควต้าฟรีประจำวัน หรือใช้เครดิตนาทีสำหรับคลิปขนาดยาว
          </p>
        </div>

        {/* Current Balance / Quick Link */}
        <div className="flex items-center gap-2">
          <Link
            href="/donate"
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:text-white hover:bg-orange-500/25 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Coins className="w-3.5 h-3.5 text-orange-400" />
            <span>เครดิต: {creditsMinutes} นาที</span>
            <Plus className="w-3.5 h-3.5 text-orange-400" />
          </Link>
        </div>
      </div>

      {/* 2 Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* 1. ฟรี 3 คลิป / วัน (Free Mode) */}
        <div
          onClick={() => setProviderMode('free')}
          className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            isFreeSelected
              ? 'border-amber-500/90 bg-amber-500/15 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-base text-zinc-100 block">
                    ฟรี 3 คลิป / วัน
                  </span>
                  <span className="text-xs font-semibold text-amber-400">
                    Free 3 คลิป : วัน
                  </span>
                </div>
              </div>
              {isFreeSelected && (
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-zinc-200 font-medium">
                ⚡ ถอดเสียงรวดเร็วด้วย AI ภาษาไทย
              </p>
              <p className="text-xs text-zinc-400">
                คลิปละไม่เกิน 2 นาที (รีเซ็ตทุกเที่ยงคืน)
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400">โควตาวันนี้:</span>
            <span className={`text-xs font-bold ${remainingDaily > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              เหลือ {remainingDaily}/{maxGroqDailyQuota} คลิป
            </span>
          </div>
        </div>

        {/* 2. Credit ที่มี (Pay-as-you-go) */}
        <div
          onClick={() => setProviderMode('credits')}
          className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            isCreditsSelected
              ? 'border-emerald-500/90 bg-emerald-500/15 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-base text-zinc-100 block">
                    Credit ที่มี
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    คงเหลือ {creditsMinutes} นาที
                  </span>
                </div>
              </div>
              {isCreditsSelected && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-zinc-200 font-medium">
                💎 คลิปยาวเท่าไหร่ก็ได้
              </p>
              <p className="text-xs text-zinc-400">
                หักเครดิตตามความยาวจริงของคลิป
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <Link
              href="/donate"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>+ เติมเครดิต</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[11px] text-zinc-400">ไม่มีวันหมดอายุ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
