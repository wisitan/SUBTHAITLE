'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { Flame, Heart } from 'lucide-react';

export function Header() {
  const { dailyUsageCount, maxDailyFreeQuota } = useAppStore();

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 overflow-hidden">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-md shadow-orange-500/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform shrink-0">
            <Image
              src="/logo.png"
              alt="SUBTHAITLE Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg text-white tracking-tight truncate">
                SUBTHAITLE
              </span>
              <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md shrink-0">
                v4.12
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium truncate hidden sm:block">Thai Caption & Subtitle Studio</p>
          </div>
        </Link>

        {/* Quota & Donate Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Daily Quota Badge - Always visible */}
          <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs sm:text-sm shrink-0">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            <span className="text-zinc-300 hidden md:inline font-medium">โควต้าฟรีวันนี้:</span>
            <span className="font-bold text-amber-400 whitespace-nowrap">
              {dailyUsageCount}/{maxDailyFreeQuota} <span className="hidden sm:inline">คลิป</span>
            </span>
          </div>

          {/* Donate / Support Button */}
          <Link
            href="/donate"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-rose-200 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 transition-all shadow-sm shadow-rose-500/10 cursor-pointer shrink-0"
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 fill-rose-400/20 shrink-0" />
            <span className="hidden sm:inline">สนับสนุนผู้พัฒนา</span>
            <span className="sm:hidden">สนับสนุน</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
