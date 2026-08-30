'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore, TranscriptionProvider } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import {
  Cloud,
  Key,
  Cpu,
  CheckCircle2,
  Lock,
  Heart,
  ShieldCheck,
  Zap,
  Crown,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { LocalServerModal } from './local-server-modal';
import { ApiKeyGuideModal } from './api-key-guide-modal';

export function ProviderSelector() {
  const { provider, setProvider, groqApiKey, setGroqApiKey } = useAppStore();
  const { isPaid, isPro } = useAuth();

  const [showKeyInput, setShowKeyInput] = useState(Boolean(groqApiKey));
  const [isLocalServerOnline, setIsLocalServerOnline] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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
    const interval = setInterval(checkHealth, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelect = (selected: TranscriptionProvider) => {
    if (selected === 'groq' && !showKeyInput) {
      setProvider('groq');
    } else if (selected === 'local') {
      if (!isPaid) return; // Locked on free tier
      setProvider('local');
      setShowKeyInput(false);
      if (!isLocalServerOnline) {
        setIsModalOpen(true);
      }
    }
  };

  return (
    <div className="w-full max-w-full bg-zinc-900/95 border border-zinc-700/80 hover:border-zinc-500 rounded-3xl p-4 sm:p-6 shadow-xl overflow-hidden transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400 shrink-0" />
            <span>เครื่องมือถอดเสียง (AI Engine)</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 mt-0.5 leading-relaxed">
            ประมวลผลเสียงภาษาไทยความเร็วสูง แม่นยำระดับคำ (Word-level timestamps)
          </p>
        </div>

        {/* Tier Status Badge */}
        <div className="flex items-center gap-2">
          {isPro ? (
            <Link
              href="/donate"
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pro Creator 299฿</span>
            </Link>
          ) : isPaid ? (
            <Link
              href="/donate"
              className="px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Supporter 99฿</span>
            </Link>
          ) : (
            <Link
              href="/donate"
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs sm:text-sm transition-colors flex items-center gap-1.5 font-medium"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>ดูสิทธิพิเศษ</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3 Provider Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
        {/* 1. Free AI Engine */}
        <div
          onClick={() => {
            setShowKeyInput(false);
            setProvider('groq');
            setGroqApiKey('');
          }}
          className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
            provider === 'groq' && !showKeyInput
              ? 'border-orange-500/80 bg-orange-500/15 ring-1 ring-orange-500/40 shadow-lg shadow-orange-500/5'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    ถอดเสียง ทำซับฟรี!!
                  </span>
                </div>
              </div>

              {provider === 'groq' && !showKeyInput && (
                <div className="flex items-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-3 leading-relaxed border-t border-zinc-800/80 pt-2.5 min-h-[3.75rem] flex items-start">
            รองรับคลิปขนาดไม่เกิน 100 mb และความยาวไม่เกิน 2 นาที
          </p>
        </div>

        {/* 2. Custom API Key (BYOK Mode) */}
        <div
          onClick={() => {
            if (!isPaid) return;
            setShowKeyInput(true);
            setProvider('groq');
          }}
          className={`relative p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between h-full ${
            !isPaid
              ? 'border-zinc-800/60 bg-zinc-950/20 opacity-80'
              : provider === 'groq' && showKeyInput
              ? 'border-emerald-500/80 bg-emerald-500/15 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/5 cursor-pointer'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm cursor-pointer'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    ถอดเสียง ทำซับไม่จำกัด (ใช้ API Key ของตนเอง)
                  </span>
                </div>
              </div>

              {provider === 'groq' && showKeyInput ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : null}
            </div>

            <div className="min-h-[2rem] flex items-center mt-2.5">
              <span className="text-xs text-emerald-400 font-semibold leading-snug flex items-center gap-1.5">
                {isPaid ? (
                  '⚡ ไม่จำกัดขนาด, ความยาว & จำนวนคลิป'
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>ปลดล็อคเมื่อ Donate จ่ายครั้งเดียวไม่มีรายเดือน!!</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-3 leading-relaxed border-t border-zinc-800/80 pt-2.5 min-h-[3.75rem] flex items-start">
            ถอดเสียง ทำซับได้ไม่จำกัดขนาดไฟล์ ไม่จำกัดความยาว และไม่จำกัดจำนวนคลิป
          </p>
        </div>

        {/* 3. Local Whisper Mode */}
        <div
          onClick={() => {
            if (!isPaid) return;
            handleSelect('local');
          }}
          className={`relative p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between h-full ${
            !isPaid
              ? 'border-zinc-800/60 bg-zinc-950/20 opacity-80'
              : provider === 'local'
              ? 'border-indigo-500/80 bg-indigo-500/15 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/5 cursor-pointer'
              : 'border-zinc-700/70 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-900 shadow-sm cursor-pointer'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-zinc-100 block">
                    ถอดเสียง ทำซับไม่จำกัด (ใช้ Local AI ของตนเอง)
                  </span>
                </div>
              </div>

              {isPaid && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                    title="ดูวิธีเปิดใช้งานเซิร์ฟเวอร์ในเครื่อง"
                  >
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span>วิธีเปิดใช้</span>
                  </button>
                  {provider === 'local' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                </div>
              )}
            </div>

            <div className="min-h-[2rem] flex items-center mt-2.5">
              {!isPaid ? (
                <span className="text-xs text-emerald-400 font-semibold leading-snug flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>ปลดล็อคเมื่อ Donate จ่ายครั้งเดียวไม่มีรายเดือน!!</span>
                </span>
              ) : isLocalServerOnline ? (
                <span className="text-xs text-emerald-400 font-semibold leading-snug flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  🟢 Online (localhost:8765)
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-semibold leading-snug flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  🔴 Offline (คลิกเพื่อดูวิธีเปิด)
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-3 leading-relaxed border-t border-zinc-800/80 pt-2.5 min-h-[3.75rem] flex items-start">
            ใช้ AI ในเครื่อง Mac/PC ออฟไลน์ 100% ไม่จำกัดขนาดและความยาวคลิป ไม่ส่งไปประมวลผลบน cloud
          </p>
        </div>
      </div>

      {/* BYOK Input Form (Only for Paid / Unlocked users) */}
      {isPaid && showKeyInput && (() => {
        const trimmed = groqApiKey.trim();
        const isKeyOpenAI = trimmed.startsWith('sk-');
        const isKeyGroq = trimmed.startsWith('gsk_');

        return (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="password"
                  placeholder="กรอก API Key ของ OpenAI (sk-...) หรือ Groq (gsk_...)"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                วิธีขอ API Key
              </button>
            </div>

            {/* Provider Detected Badge */}
            {isKeyOpenAI && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> ตรวจพบ OpenAI Whisper-1 (ความแม่นยำระดับพรีเมียม)
                </span>
              </div>
            )}
            {isKeyGroq && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5" /> ตรวจพบ Groq Whisper V3 (ฟรี 100% / เร็วสูง)
                </span>
              </div>
            )}

            <div className="mt-2.5 flex flex-col gap-1.5">
              <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                API Key จะถูกเก็บในเบราว์เซอร์ของคุณเท่านั้น (ไม่ส่งไปบันทึกบนเซิร์ฟเวอร์ของเรา)
              </p>
              <p className="text-xs text-zinc-400 flex items-start gap-1.5 ml-1">
                <span className="text-zinc-500 mt-0.5">•</span>
                <span>ถ้าไม่มั่นใจในการใช้ BYOK หรือกลัว Key รั่วไหล คุณสามารถเลือกใช้ <strong>ระบบเติมเครดิต</strong> แทนได้ค่ะ ปลอดภัย 100% เพราะจะใช้ Key ฝั่งเซิร์ฟเวอร์ของเราเอง</span>
              </p>
            </div>
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
