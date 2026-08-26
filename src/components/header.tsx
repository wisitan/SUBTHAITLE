'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { Flame, Heart } from 'lucide-react';

export function Header() {
  const { dailyUsageCount, maxDailyFreeQuota } = useAppStore();

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-orange-500/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="SUBTHAITLE Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tight">
                SUBTHAITLE
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md">
                v4.12
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Thai Caption & Subtitle Studio</p>
          </div>
        </Link>

        {/* Quota & Donate Button */}
        <div className="flex items-center gap-3">
          {/* Daily Quota Badge - Always visible */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-zinc-400 hidden sm:inline">โควต้าฟรีวันนี้:</span>
            <span className="font-bold text-amber-400">
              {dailyUsageCount}/{maxDailyFreeQuota} คลิป
            </span>
          </div>

          {/* Donate / Support Button */}
          <Link
            href="/donate"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-sm shadow-rose-500/10"
          >
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
            <span>สนับสนุนผู้พัฒนา</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
