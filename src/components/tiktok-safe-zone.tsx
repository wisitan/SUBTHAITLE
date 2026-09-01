'use client';

import React from 'react';
import { ArrowLeft, Search, ShoppingBag } from 'lucide-react';

interface TikTokSafeZoneProps {
  visible: boolean;
}

export function TikTokSafeZone({ visible }: TikTokSafeZoneProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden font-sans flex flex-col justify-between p-2">
      {/* 1. Top Navigation Bar (Realistic TikTok Search Pill & Back Arrow) */}
      <div className="w-full flex items-center gap-2 pt-1.5 px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
        {/* Back Arrow */}
        <div className="w-7 h-7 flex items-center justify-center text-white shrink-0">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* Search Bar Pill */}
        <div className="flex-1 flex items-center justify-between bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-white shadow-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <span className="text-[11px] text-white/90 truncate font-medium">
              ค้นหาเนื้อหาที่เกี่ยวข้อง
            </span>
          </div>
          <span className="text-[10px] text-white/70 font-semibold pl-2 border-l border-white/20 shrink-0">
            ค้นหา
          </span>
        </div>
      </div>

      {/* 2. Safe Zone Dotted Guideline Box (พื้นที่ปลอดภัยสำหรับวางซับไตเติล ไม่โดนตะกร้าเหลือง/ปุ่มบัง) */}
      <div
        className="absolute left-[3%] right-[19%] top-[9%] bottom-[32%] border-2 border-dashed border-amber-400/80 rounded-2xl flex items-center justify-center bg-amber-500/[0.03] shadow-[0_0_15px_rgba(245,158,11,0.15)]"
      >
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/85 backdrop-blur-md rounded-md text-[9.5px] font-mono font-bold text-amber-300 border border-amber-400/60 shadow-lg">
          📱 TikTok Safe Zone (วางซับเหนือบอร์ด & ตะกร้า)
        </span>
      </div>

      {/* 3. Right Action Column (Avatar, Like, Comment, Bookmark, Share, Audio Disc) */}
      <div className="absolute right-1.5 bottom-3.5 flex flex-col items-center gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        {/* Profile Avatar with Overlapping + Badge */}
        <div className="relative mb-0.5">
          <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white text-xs font-black shadow-lg">
            👓
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center border border-white shadow">
            <span className="text-[10px] font-black leading-none">+</span>
          </div>
        </div>

        {/* Like Heart */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white drop-shadow">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">2</span>
        </div>

        {/* Comment Bubble */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white drop-shadow">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.44 3.86 7.08-.24 1.35-.91 2.9-2.3 3.88 1.95.12 4.12-.47 5.76-1.52.86.36 1.76.56 2.68.56 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-4 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
          </div>
          <span className="text-[9.5px] font-bold text-white tracking-tight">คนแรก</span>
        </div>

        {/* Bookmark Ribbon */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white drop-shadow">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-tight">0</span>
        </div>

        {/* Curved Share Arrow */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6.5 h-6.5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white drop-shadow">
              <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
            </svg>
          </div>
          <span className="text-[9.5px] font-bold text-white tracking-tight">แชร์</span>
        </div>

        {/* Spinning Vinyl / Profile Disc */}
        <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin duration-3000 shadow-md">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 border border-white" />
        </div>
      </div>

      {/* 4. Bottom Area: Yellow Shopping Basket (ตะกร้าเหลือง) + Creator Username + Caption */}
      <div className="w-full flex flex-col gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] pb-1">
        {/* TikTok Shop Yellow Shopping Basket Badge (ตะกร้าเหลือง) */}
        <div className="w-[74%] max-w-[260px] bg-black/60 backdrop-blur-md border border-white/15 rounded-xl p-2 flex items-center gap-2.5 shadow-lg">
          <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center text-zinc-950 shrink-0 shadow-sm">
            <ShoppingBag className="w-4 h-4 fill-zinc-950 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white truncate leading-tight">
              Kimiso สายชาร์จ 240w
            </p>
            <p className="text-[9.5px] text-white/80 truncate leading-tight mt-0.5">
              จัดส่งฟรีสิ้นสุดใน 24 ชั่วโมง
            </p>
          </div>
        </div>

        {/* Creator Handle & Description */}
        <div className="w-[76%] px-1 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>เฮียเอ สายเดต้า</span>
            <span className="text-white/60 text-[10px] font-normal">• 1 วันที่แล้ว</span>
          </p>
          <p className="text-[10.5px] text-white/95 line-clamp-2 leading-tight font-normal">
            สายชาร์จด่วนแนวตั้งสำหรับสายเกม หรือสาย เสพซีรี่ส์ #สายชาร์จ #สายชาร์จเร็...เพิ่มเติม
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
