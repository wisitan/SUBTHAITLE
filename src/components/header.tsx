'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfileButton } from '@/components/user-profile-button';

export function Header() {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
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
              <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md shrink-0 font-mono">
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? `uat-${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : 'uat-736c820'}
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium truncate hidden sm:block">Thai Caption & Subtitle Studio</p>
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/donate"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 border border-orange-500/40 text-orange-300 hover:text-orange-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="ร่วมสนับสนุนค่าเซิร์ฟเวอร์ & เลี้ยงกาแฟทีมงาน"
          >
            <span>☕</span>
            <span className="hidden sm:inline">เลี้ยงกาแฟทีมงาน</span>
            <span className="sm:hidden">สนับสนุน</span>
          </Link>
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
}
