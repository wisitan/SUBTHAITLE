'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { Sparkles, Code2, Flame } from 'lucide-react';

export function Header() {
  const { tier, dailyUsageCount, maxDailyFreeQuota } = useAppStore();

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-white/20">
            <span className="text-xl font-black text-white tracking-wider">ST</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-zinc-100 tracking-tight">
                SUBTHAITLE
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md">
                v4.12
              </span>
            </div>
            <p className="text-xs text-zinc-400">Thai Caption & Subtitle Studio</p>
          </div>
        </div>

        {/* Status / Quota & Actions */}
        <div className="flex items-center gap-3">
          {/* Quota Indicator */}
          {tier === 'free' ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-zinc-400">โควต้าฟรีวันนี้:</span>
              <span className="font-bold text-amber-400">
                {dailyUsageCount}/{maxDailyFreeQuota} คลิป
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-xs text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">
                {tier === 'coffee' ? 'Tier กาแฟ (69฿)' : 'Tier เลี้ยงข้าว (299฿)'}
              </span>
            </div>
          )}

          {/* GitHub link */}
          <a
            href="https://github.com/wisitan/SUBTHAITLE"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
