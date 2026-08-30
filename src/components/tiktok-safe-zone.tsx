'use client';

import React from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music,
  Plus,
  Search,
  Wifi,
  Battery,
} from 'lucide-react';

interface TikTokSafeZoneProps {
  visible: boolean;
}

export function TikTokSafeZone({ visible }: TikTokSafeZoneProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 select-none overflow-hidden font-sans">
      {/* 1. Top Status Bar & Navigation Mockup */}
      <div className="w-full flex flex-col gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {/* iOS Status Bar */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 px-1 pt-0.5">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <Wifi className="w-3 h-3 text-white/90" />
            <Battery className="w-3.5 h-3.5 text-white/90" />
          </div>
        </div>

        {/* Following | For You Tabs */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="w-6" />
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-white/60 hover:text-white/80 cursor-default">Following</span>
            <span className="text-white/40">|</span>
            <span className="text-white relative font-extrabold">
              For You
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />
            </span>
          </div>
          <Search className="w-4 h-4 text-white/80" />
        </div>
      </div>

      {/* 2. Middle Safe Zone Guideline Area */}
      <div className="flex-1 my-2 border-2 border-dashed border-amber-400/50 rounded-2xl relative flex items-center justify-center">
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-mono font-bold text-amber-300 border border-amber-400/40 shadow-md">
          📱 TikTok Safe Zone
        </span>
      </div>

      {/* 3. Right Action Bar (Avatar, Likes, Comments, Share, Music) */}
      <div className="absolute right-2.5 bottom-16 flex flex-col items-center gap-3.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
        {/* Profile Avatar with + badge */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
            ST
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black border border-black">
            <Plus className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        </div>

        {/* Like Heart */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight">4.4K</span>
        </div>

        {/* Comment Bubble */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight">64</span>
        </div>

        {/* Bookmark */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight">23</span>
        </div>

        {/* Share Arrow */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight">Share</span>
        </div>

        {/* Spinning Vinyl Disc */}
        <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin duration-3000">
          <div className="w-3 h-3 rounded-full bg-rose-500 border border-white" />
        </div>
      </div>

      {/* 4. Bottom Creator Handle & Sound Track */}
      <div className="w-[72%] pb-2 px-1 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] space-y-1">
        <p className="text-xs font-bold text-white flex items-center gap-1">
          <span>@subthaitle</span>
          <span className="text-[10px] px-1 py-0.2 bg-white/20 rounded font-normal">Creator</span>
        </p>
        <p className="text-[11px] text-white/90 line-clamp-2 leading-tight">
          ใส่ซับไตเติลภาษาไทยความคมชัดสูง ปรับสไตล์โดนใจ ไม่บังปุ่ม TikTok 🔥✨
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-medium">
          <Music className="w-3 h-3 text-white/90 animate-pulse shrink-0" />
          <span className="truncate">Original Sound - SUBTHAITLE Studio</span>
        </div>
      </div>
    </div>
  );
}
