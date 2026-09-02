'use client';

import React from 'react';
import { ArrowLeft, Search, MoreHorizontal } from 'lucide-react';

interface TikTokSafeZoneProps {
  visible: boolean;
}

export function TikTokSafeZone({ visible }: TikTokSafeZoneProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden font-sans flex flex-col justify-between p-2.5">
      {/* ========================================================================= */}
      {/* 1. Top Navigation Bar (Realistic TikTok Search Pill & Back Arrow)          */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center gap-2.5 pt-1 px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        {/* Back Arrow */}
        <div className="w-6 h-6 flex items-center justify-center text-white shrink-0">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* Search Bar Pill (Matching Real TikTok Pill) */}
        <div className="flex-1 flex items-center justify-between bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-white shadow-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-white/90 shrink-0" />
            <span className="text-xs text-white/90 truncate font-medium">
              ค้นหาเนื้อหาที่เกี่ยวข้อง
            </span>
          </div>
          <span className="text-[11px] text-white/90 font-bold pl-2.5 border-l border-white/20 shrink-0">
            ค้นหา
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Right Action Column (Positioned accurately at right edge)              */}
      {/* ========================================================================= */}
      <div className="absolute right-2.5 bottom-6 flex flex-col items-center gap-3.5 z-20 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]">
        {/* Profile Avatar (Plain Orange Circle with + Badge) */}
        <div className="relative mb-0.5">
          <div className="w-9 h-9 rounded-full border-1.5 border-white bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center border-1.5 border-white shadow-md">
            <span className="text-[9.5px] font-black leading-none">+</span>
          </div>
        </div>

        {/* Like Heart */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="text-[10.5px] font-extrabold text-white tracking-tight mt-0.5">2</span>
        </div>

        {/* Comment Bubble */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.44 3.86 7.08-.24 1.35-.91 2.9-2.3 3.88 1.95.12 4.12-.47 5.76-1.52.86.36 1.76.56 2.68.56 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-4 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight mt-0.5">คนแรก</span>
        </div>

        {/* Bookmark Ribbon */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white drop-shadow">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <span className="text-[10.5px] font-extrabold text-white tracking-tight mt-0.5">0</span>
        </div>

        {/* More Options / Share (...) */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 flex items-center justify-center">
            <MoreHorizontal className="w-7 h-7 text-white stroke-[2.5] drop-shadow" />
          </div>
        </div>

        {/* Spinning Vinyl / Music Disc */}
        <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-zinc-600 flex items-center justify-center animate-spin duration-3000 shadow-xl mt-0.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 border border-white" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Bottom Area: Yellow Basket + Creator Info + Caption + Scrubber Bar     */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] z-20 pb-0.5">
        {/* TikTok Shop Yellow Shopping Basket Badge (Almost fully transparent background) */}
        <div className="w-fit max-w-[80%] bg-black/15 backdrop-blur-[2px] border border-white/10 rounded-md px-2 py-0.5 flex items-center gap-1.5 shadow-sm">
          {/* Yellow Shopping Bag Icon */}
          <div className="w-4.5 h-4.5 rounded bg-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white stroke-white stroke-[0.8]">
              <path d="M16 6V4a4 4 0 00-8 0v2H3v14a2 2 0 002 2h14a2 2 0 002-2V6h-5zm-6-2a2 2 0 014 0v2h-4V4zm9 16H5V8h14v12z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[10.5px] font-medium text-white truncate">
              ชื่อสินค้าในตะกร้า TikTok
            </p>
          </div>
        </div>

        {/* Creator Handle & Description */}
        <div className="w-[78%] px-0.5 space-y-0.5">
          <p className="text-xs font-bold text-white tracking-wide flex items-center gap-1 leading-tight">
            <span>ชื่อครีเอเตอร์</span>
            <span className="text-white/70 text-[10px] font-normal">• 1 วันที่แล้ว</span>
          </p>
          <p className="text-[10.5px] text-white/95 line-clamp-2 leading-tight font-normal">
            ข้อความอธิบายวิดีโอ แคปชัน และแฮชแท็ก #fyp #ครีเอเตอร์ #รีวิว...เพิ่มเติม
          </p>
        </div>

        {/* Video Scrubber Line Indicator with Circle Thumb at bottom */}
        <div className="w-full h-1 bg-white/25 rounded-full relative mt-0.5">
          <div className="w-1/4 h-full bg-white rounded-full relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
}


