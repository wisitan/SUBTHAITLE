'use client';

import React from 'react';
import { Plus, Search, Tv } from 'lucide-react';

interface TikTokSafeZoneProps {
  visible: boolean;
}

export function TikTokSafeZone({ visible }: TikTokSafeZoneProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden font-sans flex flex-col justify-between p-2">
      {/* 1. Top Navigation Bar - Compact & Realistic TikTok Dimensions */}
      <div className="w-full flex items-center justify-between pt-1 px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
        {/* Left: LIVE Badge */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-1.5 py-0.5 rounded-full text-white text-[9.5px] font-bold">
          <Tv className="w-2.5 h-2.5 text-white" />
          <span>LIVE</span>
        </div>

        {/* Center Tabs: เพื่อน (19), กำลังติดตาม, สำหรับคุณ (Subtle, compact font) */}
        <div className="flex items-center gap-2.5 text-[11.5px] font-bold text-white/70">
          <div className="relative flex items-center">
            <span>เพื่อน</span>
            <span className="absolute -top-1 -right-2.5 px-0.8 py-0.1 bg-rose-500 text-white text-[8px] font-black rounded-full scale-90">
              19
            </span>
          </div>
          <span className="text-white/75">กำลังติดตาม</span>
          <div className="relative text-white font-extrabold flex flex-col items-center">
            <span>สำหรับคุณ</span>
            <span className="w-3.5 h-0.5 bg-white rounded-full mt-0.5" />
          </div>
        </div>

        {/* Right: Search Icon */}
        <div className="p-0.5">
          <Search className="w-3.5 h-3.5 text-white drop-shadow" />
        </div>
      </div>

      {/* 2. Middle Safe Zone Guideline Area (พื้นที่ปลอดภัยสำหรับวางซับไตเติล) */}
      <div
        className="absolute left-[3%] right-[19%] top-[9%] bottom-[13%] border-2 border-dashed border-amber-400/60 rounded-2xl flex items-center justify-center bg-amber-500/[0.02]"
      >
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[9.5px] font-mono font-bold text-amber-300 border border-amber-400/50 shadow-lg">
          📱 TikTok Safe Zone
        </span>
      </div>

      {/* 3. Right Action Column (Avatar with +, Like, Comment, Bookmark, Share, Audio Disc) */}
      <div className="absolute right-1.5 bottom-3.5 flex flex-col items-center gap-2.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        {/* Profile Avatar with Overlapping + Badge */}
        <div className="relative mb-0.5">
          <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-tr from-pink-400 via-rose-500 to-amber-400 flex items-center justify-center text-white text-xs font-black shadow-lg">
            🐰
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center border border-white shadow">
            <Plus className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        </div>

        {/* Like Heart */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">20.5K</span>
        </div>

        {/* Comment Bubble with 3 Dots */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.44 3.86 7.08-.24 1.35-.91 2.9-2.3 3.88 1.95.12 4.12-.47 5.76-1.52.86.36 1.76.56 2.68.56 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-4 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">69</span>
        </div>

        {/* Bookmark Ribbon */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">1,872</span>
        </div>

        {/* Curved Share Arrow */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">5,285</span>
        </div>

        {/* Spinning Vinyl Audio Disc */}
        <div className="w-8.5 h-8.5 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin duration-3000 shadow-md">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 border border-white" />
        </div>
      </div>

      {/* 4. Bottom Creator Info & Caption */}
      <div className="w-full flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] pb-1">
        {/* Creator Handle & Caption (Width restricted so it doesn't collide with right action column) */}
        <div className="w-[76%] px-1 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1">
            <span>chiikawa</span>
          </p>
          <p className="text-[10.5px] text-white/90 line-clamp-2 leading-tight font-normal">
            #chiikawa#usaga #chiikawaedit#chiikaaaa123#chiikaaaa ✨🔥
          </p>
        </div>

        {/* Video Scrubber Line Indicator */}
        <div className="w-full h-0.5 bg-white/25 rounded-full relative mt-0.5">
          <div className="w-1/3 h-full bg-white rounded-full relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow" />
          </div>
        </div>
      </div>
    </div>
  );
}
