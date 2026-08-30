'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import {
  Sparkles,
  Zap,
  Coins,
  Key,
  Cpu,
  CheckCircle2,
  Lock,
  Plus,
  HelpCircle,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { LocalServerModal } from './local-server-modal';
import { ApiKeyGuideModal } from './api-key-guide-modal';

export function ProviderSelector() {
  const {
    providerMode,
    setProviderMode,
    groqApiKey,
    setGroqApiKey,
    creditsMinutes,
    isLifetimeUnlocked,
    googleMonthlyUsageCount,
    maxGoogleMonthlyQuota,
    groqDailyUsageCount,
    maxGroqDailyQuota,
    syncQuotas,
  } = useAppStore();

  const { user } = useAuth();
  const [isLocalServerOnline, setIsLocalServerOnline] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    syncQuotas(user?.id);
  }, [user, syncQuotas]);

  // Live healthcheck polling for Local Whisper Server (http://127.0.0.1:8765/health)
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8765/health', {
          method: 'GET',
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok && isMounted) {
          setIsLocalServerOnline(true);
        } else if (isMounted) {
          setIsLocalServerOnline(false);
        }
      } catch {
        if (isMounted) setIsLocalServerOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const remainingGoogle = Math.max(0, maxGoogleMonthlyQuota - googleMonthlyUsageCount);
  const remainingGroq = Math.max(0, maxGroqDailyQuota - groqDailyUsageCount);

  return (
    <div className="w-full max-w-full bg-zinc-900/95 border border-zinc-700/80 hover:border-zinc-500 rounded-3xl p-4 sm:p-6 shadow-xl overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400 shrink-0" />
            <span>เลือกโหมดการถอดเสียง & โควต้า (AI Engine & Quota)</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 mt-0.5 leading-relaxed">
            เลือกโมเดล AI ที่ต้องการใช้งาน หรือใช้เครดิต/กุญแจส่วนตัวของคุณ
          </p>
        </div>

        {/* Current Balance / Quick Link */}
        <div className="flex items-center gap-2">
          <Link
            href="/donate"
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:text-white hover:bg-orange-500/25 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Coins className="w-3.5 h-3.5 text-orange-400" />
            <span>เครดิต: {creditsMinutes} นาที</span>
            <Plus className="w-3.5 h-3.5 text-orange-400" />
          </Link>
        </div>
      </div>

      {/* 4 Provider Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        {/* 1. Google AI (Free 5 Clips / Month) */}
        <div
          onClick={() => setProviderMode('google_free')}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            providerMode === 'google_free'
              ? 'border-orange-500/90 bg-orange-500/15 ring-1 ring-orange-500/50 shadow-lg shadow-orange-500/10'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    Google AI
                  </span>
                  <span className="text-[11px] font-semibold text-sky-400">
                    Free 5 คลิป : เดือน
                  </span>
                </div>
              </div>
              {providerMode === 'google_free' && (
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-200 font-medium">
                🎯 แม่น เก่งภาษาไทยที่สุด
              </p>
              <p className="text-[11px] text-zinc-400">
                คลิปละไม่เกิน 2 นาที
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">โควต้าเดือนนี้:</span>
            <span className={`text-xs font-bold ${remainingGoogle > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              เหลือ {remainingGoogle}/{maxGoogleMonthlyQuota} คลิป
            </span>
          </div>
        </div>

        {/* 2. Groq AI (Free 3 Clips / Day) */}
        <div
          onClick={() => setProviderMode('groq_free')}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            providerMode === 'groq_free'
              ? 'border-amber-500/90 bg-amber-500/15 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    Groq AI
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400">
                    Free 3 คลิป : วัน
                  </span>
                </div>
              </div>
              {providerMode === 'groq_free' && (
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-200 font-medium">
                ⚡ เร็ว เก่งหลายภาษา
              </p>
              <p className="text-[11px] text-zinc-400">
                คลิปละไม่เกิน 2 นาที
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">โควตาวันนี้:</span>
            <span className={`text-xs font-bold ${remainingGroq > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              เหลือ {remainingGroq}/{maxGroqDailyQuota} คลิป
            </span>
          </div>
        </div>

        {/* 3. Credit Balance (Pay-as-you-go) */}
        <div
          onClick={() => setProviderMode('credits')}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            providerMode === 'credits'
              ? 'border-emerald-500/90 bg-emerald-500/15 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    Credit ที่มี
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    คงเหลือ {creditsMinutes} นาที
                  </span>
                </div>
              </div>
              {providerMode === 'credits' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-200 font-medium">
                💎 คลิปยาวเท่าไหร่ก็ได้
              </p>
              <p className="text-[11px] text-zinc-400">
                หักเครดิตตามความยาวจริง
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
            <Link
              href="/donate"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>+ เติมเครดิต</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[10px] text-zinc-400">ไม่มีวันหมดอายุ</span>
          </div>
        </div>

        {/* 4. BYOK / Local AI (Locked for Lifetime Pass 699฿) */}
        <div
          onClick={() => {
            if (isLifetimeUnlocked) {
              setProviderMode('byok');
            }
          }}
          className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between h-full ${
            !isLifetimeUnlocked
              ? 'border-zinc-800/70 bg-zinc-950/30 opacity-90'
              : providerMode === 'byok' || providerMode === 'local'
              ? 'border-purple-500/90 bg-purple-500/15 ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/10 cursor-pointer'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm cursor-pointer'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  {isLifetimeUnlocked ? <Key className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    BYOK / Local
                  </span>
                  <span className="text-[11px] font-semibold text-purple-400">
                    {isLifetimeUnlocked ? 'ปลดล็อกตลอดชีพ' : 'ซื้อขาด 699฿'}
                  </span>
                </div>
              </div>
              {isLifetimeUnlocked && (providerMode === 'byok' || providerMode === 'local') && (
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-200 font-medium">
                🔑 ใส่ Key เอง / ในเครื่อง
              </p>
              <p className="text-[11px] text-zinc-400">
                ไม่จำกัดคลิปและความยาว
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
            {!isLifetimeUnlocked ? (
              <Link
                href="/donate"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors w-full justify-between"
              >
                <span>ดูรายละเอียด / ปลดล็อก</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> พร้อมใช้งาน
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BYOK Input Form (When BYOK mode is active & unlocked) */}
      {isLifetimeUnlocked && (providerMode === 'byok' || providerMode === 'local') && (() => {
        const trimmed = groqApiKey.trim();
        const isKeyGoogle = trimmed.startsWith('AIza');
        const isKeyOpenAI = trimmed.startsWith('sk-');
        const isKeyGroq = trimmed.startsWith('gsk_');

        return (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="password"
                  placeholder="กรอก API Key ของ Google Cloud (AIza...), OpenAI (sk-...), หรือ Groq (gsk_...)"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-purple-400 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/60 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                วิธีขอ API Key
              </button>
            </div>

            {/* Provider Detected Badges */}
            {isKeyGoogle && (
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> ตรวจพบ Google Cloud Speech-to-Text (ความแม่นยำภาษาไทยสูงสุด)
                </span>
              </div>
            )}
            {isKeyOpenAI && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> ตรวจพบ OpenAI Whisper-1 (ความแม่นยำระดับพรีเมียม)
                </span>
              </div>
            )}
            {isKeyGroq && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5" /> ตรวจพบ Groq Whisper V3 (เร็วพิเศษ)
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Local Server Setup Modal */}
      <LocalServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isOnline={isLocalServerOnline}
      />

      {/* API Key Guide Modal */}
      <ApiKeyGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
