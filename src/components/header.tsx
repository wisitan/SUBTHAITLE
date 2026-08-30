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
              <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md shrink-0">
                v4.12
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium truncate hidden sm:block">Thai Caption & Subtitle Studio</p>
          </div>
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
}
