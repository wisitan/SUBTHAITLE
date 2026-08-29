'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { 
  LogIn, 
  LogOut, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  ChevronDown,
  Loader2
} from 'lucide-react';

export function UserProfileButton() {
  const { user, profile, tier, isLoading, signInWithGoogle, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
        <span>กำลังตรวจสอบ...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/60 text-zinc-200 hover:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
      >
        <LogIn className="w-3.5 h-3.5 text-orange-400" />
        <span>เข้าสู่ระบบด้วย Google</span>
      </button>
    );
  }

  // Tier Badge styling & label
  const getTierBadge = () => {
    switch (tier) {
      case 'tier_299':
        return {
          label: 'Pro Creator 299฿',
          icon: <Crown className="w-3 h-3 text-amber-300" />,
          classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'tier_99':
        return {
          label: 'Supporter 99฿',
          icon: <Sparkles className="w-3 h-3 text-orange-300" />,
          classes: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        };
      default:
        return {
          label: 'Free Tier (3/วัน)',
          icon: <CheckCircle2 className="w-3 h-3 text-zinc-400" />,
          classes: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
    }
  };

  const badge = getTierBadge();
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-[#181824] hover:bg-[#20202e] border border-zinc-700/80 hover:border-zinc-500 transition-all cursor-pointer shadow-sm"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={24}
            height={24}
            className="w-6 h-6 rounded-lg object-cover ring-1 ring-zinc-700"
          />
        ) : (
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
        )}

        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-zinc-200 max-w-[100px] sm:max-w-[130px] truncate leading-tight">
            {displayName}
          </span>
        </div>

        <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badge.classes}`}>
          {badge.icon}
          {badge.label}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#181824] border border-zinc-700/90 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-sm">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-100 truncate">{displayName}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>

          <div className="py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-300 px-1">
              <span>สถานะแพ็กเกจ:</span>
              <span className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[11px] ${badge.classes}`}>
                {badge.icon}
                {badge.label}
              </span>
            </div>

            {tier === 'free' && (
              <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30">
                <p className="text-[11px] text-zinc-300 mb-2 leading-relaxed">
                  ปลดล็อก BYOK ไม่จำกัด, โควต้า 5 คลิป/วัน และ Custom Presets
                </p>
                <Link
                  href="/donate"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>อัปเกรดเริ่มต้น 99฿</span>
                </Link>
              </div>
            )}

            {tier === 'tier_99' && (
              <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30">
                <p className="text-[11px] text-zinc-300 mb-2 leading-relaxed">
                  อัปเกรดเป็น Pro Creator: 20 Presets และฟอนต์พรีเมียม
                </p>
                <Link
                  href="/donate"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-bold text-xs shadow-md transition-all"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>อัปเกรดเป็น Pro (299฿)</span>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>ออกจากระบบ (Sign Out)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
