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
} from 'lucide-react';

export function ProviderSelector() {
  const {
    providerMode,
    setProviderMode,
    creditsMinutes,
    groqDailyUsageCount,
    maxGroqDailyQuota,
  } = useAppStore();

  const { user, refreshProfile } = useAuth();
  const [systemEnergy, setSystemEnergy] = React.useState<{
    energyLevel: 'full' | 'medium' | 'low' | 'empty';
    percentage: number;
    isExhausted: boolean;
  }>({
    energyLevel: 'full',
    percentage: 100,
    isExhausted: false,
  });

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
    fetch('/api/system/quota')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.percentage === 'number') {
          setSystemEnergy(data);
        }
      })
      .catch(() => {});
  }, [user, refreshProfile]);

  const remainingDaily = Math.max(0, maxGroqDailyQuota - groqDailyUsageCount);
  const isFreeSelected = providerMode === 'free' || providerMode === 'groq_free' || providerMode === 'google_free';
  const isCreditsSelected = providerMode === 'credits';

  return (
    <div className="w-full max-w-full">
      {/* Compact Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* 1. โหมดฟรีประจำวัน */}
        <button
          type="button"
          onClick={() => setProviderMode('free')}
          className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer shadow-sm ${
            isFreeSelected
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-amber-500/5'
              : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isFreeSelected
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">
                  โควต้าฟรีประจำวัน
                </span>
                {isFreeSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <span className={`text-[11px] font-semibold ${remainingDaily > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                เหลือ {remainingDaily}/{maxGroqDailyQuota} คลิป
              </span>
            </div>
          </div>

          {/* Mini Battery Gauge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800 shrink-0">
            {/* Battery Casing */}
            <div className="relative flex items-center">
              <div className="w-5 h-3 rounded-2xs border border-zinc-600 bg-zinc-900 p-0.5 flex items-center">
                <div
                  className={`h-full rounded-3xs transition-all duration-500 ${
                    systemEnergy.energyLevel === 'empty'
                      ? 'w-0'
                      : systemEnergy.energyLevel === 'low'
                      ? 'w-1/4 bg-rose-500'
                      : systemEnergy.energyLevel === 'medium'
                      ? 'w-2/3 bg-amber-400'
                      : 'w-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                  }`}
                />
              </div>
              <div className="w-0.5 h-1 bg-zinc-600 rounded-r-3xs ml-0.2" />
            </div>

            <span className={`text-[10px] font-bold ${
              systemEnergy.energyLevel === 'empty'
                ? 'text-rose-400'
                : systemEnergy.energyLevel === 'low'
                ? 'text-amber-400'
                : systemEnergy.energyLevel === 'medium'
                ? 'text-amber-300'
                : 'text-emerald-400'
            }`}>
              {systemEnergy.energyLevel === 'empty'
                ? 'โควต้าเต็ม'
                : systemEnergy.energyLevel === 'low'
                ? 'ใกล้หมด'
                : systemEnergy.energyLevel === 'medium'
                ? 'ปานกลาง'
                : 'เต็มเปี่ยม ⚡'}
            </span>
          </div>
        </button>

        {/* 2. โหมดเครดิตผู้สนับสนุน */}
        <button
          type="button"
          onClick={() => setProviderMode('credits')}
          className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer shadow-sm ${
            isCreditsSelected
              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-emerald-500/5'
              : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isCreditsSelected
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">
                  โควต้าผู้สนับสนุน
                </span>
                {isCreditsSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">
                คงเหลือ {creditsMinutes} นาที
              </span>
            </div>
          </div>

          {/* Quick Topup / Donate Link */}
          <Link
            href="/donate"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all shrink-0"
          >
            <span>เติมเวลา</span>
            <Plus className="w-3 h-3" />
          </Link>
        </button>
      </div>
    </div>
  );
}
