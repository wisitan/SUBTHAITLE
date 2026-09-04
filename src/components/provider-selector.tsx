'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import {
  Zap,
  Coins,
  CheckCircle2,
  Plus,
  Sparkles,
} from 'lucide-react';

export function ProviderSelector() {
  const {
    providerMode,
    setProviderMode,
    creditsMinutes,
  } = useAppStore();

  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  const isFreeSelected = providerMode === 'free' || providerMode === 'groq_free' || providerMode === 'google_free';
  const isCreditsSelected = providerMode === 'credits';

  return (
    <div className="w-full max-w-full">
      {/* Compact Glowing Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* 1. โหมดฟรีประจำวัน */}
        <button
          type="button"
          onClick={() => setProviderMode('free')}
          className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 text-left flex items-center justify-between gap-3 cursor-pointer overflow-hidden ${
            isFreeSelected
              ? 'border-amber-500/80 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900/80 ring-1 ring-amber-500/40 shadow-[0_0_30px_-5px_rgba(245,158,11,0.25)]'
              : 'border-zinc-800/90 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.1)]'
          }`}
        >
          {/* Subtle Inner Glow on Selected */}
          {isFreeSelected && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="flex items-center gap-2.5 min-w-0 relative z-10">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isFreeSelected
                ? 'bg-amber-500/25 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">
                  ใช้งานฟรี (ไม่จำกัดคลิป)
                </span>
                {isFreeSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-medium text-zinc-300">
                  คลิปยาว &lt; 2 นาที • ขนาด &lt; 100 MB
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10.5px] font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>ฟรีไม่อั้น</span>
          </div>
        </button>

        {/* 2. โหมดเครดิตผู้สนับสนุน */}
        <button
          type="button"
          onClick={() => setProviderMode('credits')}
          className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 text-left flex items-center justify-between gap-3 cursor-pointer overflow-hidden ${
            isCreditsSelected
              ? 'border-emerald-500/80 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-zinc-900/80 ring-1 ring-emerald-500/40 shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)]'
              : 'border-zinc-800/90 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]'
          }`}
        >
          {/* Subtle Inner Glow on Selected */}
          {isCreditsSelected && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="flex items-center gap-2.5 min-w-0 relative z-10">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isCreditsSelected
                ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">
                  โควต้าผู้สนับสนุน (VIP)
                </span>
                {isCreditsSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-emerald-400">
                  คงเหลือ {creditsMinutes} นาที
                </span>
                <span className="text-[10px] text-zinc-300 hidden sm:inline">
                  • คลิปยาว 30 นาที / 1.5GB
                </span>
              </div>
            </div>
          </div>

          {/* Quick Topup / Donate Link */}
          <Link
            href="/donate"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 shadow-sm"
          >
            <span>เติมเวลา</span>
            <Plus className="w-3 h-3" />
          </Link>
        </button>
      </div>
    </div>
  );
}
