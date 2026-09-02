'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { 
  LogIn, 
  LogOut, 
  ChevronDown,
  Loader2
} from 'lucide-react';

export function UserProfileButton() {
  const { user, profile, isLoading, signInWithGoogle, signOut } = useAuth();
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
          <span className="text-xs font-semibold text-zinc-200 max-w-[120px] sm:max-w-[160px] truncate leading-tight">
            {displayName}
          </span>
        </div>

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

          {/* Credits Balance & Donate */}
          <div className="py-2.5 px-1 border-b border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">โควต้าถอดเสียง:</span>
              <strong className="text-orange-400 font-mono font-bold">
                {profile?.credits_minutes || 0} นาที
              </strong>
            </div>

            <a
              href="/donate"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 hover:text-orange-200 text-xs font-bold transition-all cursor-pointer"
            >
              <span>☕ เลี้ยงกาแฟทีมงาน (+โควต้า)</span>
            </a>
          </div>

          <div className="pt-2">
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
