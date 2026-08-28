'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore, TranscriptionProvider } from '@/lib/store';
import {
  Cloud,
  Key,
  Cpu,
  CheckCircle2,
  Lock,
  Heart,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

export function ProviderSelector() {
  const { provider, setProvider, tier, setTier, groqApiKey, setGroqApiKey } = useAppStore();
  const [showKeyInput, setShowKeyInput] = useState(Boolean(groqApiKey));

  const isPaid = tier === 'coffee' || tier === 'meal';

  const handleSelect = (selected: TranscriptionProvider) => {
    if (selected === 'groq' && !showKeyInput) {
      setProvider('groq');
    } else if (selected === 'local') {
      if (!isPaid) return; // Locked on free tier
      setProvider('local');
      setShowKeyInput(false);
    }
  };

  return (
    <div className="w-full max-w-full bg-zinc-900 border border-zinc-700 rounded-3xl p-4 sm:p-6 shadow-xl overflow-hidden">
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

        {/* Tier Status & Quick Dev Testing Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Quick Tier Switcher for Testing */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-zinc-800 text-xs">
            <FlaskConical className="w-3.5 h-3.5 text-amber-400 mr-0.5 shrink-0" />
            <span className="text-zinc-400 hidden sm:inline mr-1 font-medium">โหมดทดสอบ:</span>
            <button
              type="button"
              onClick={() => setTier('free')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'free'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="ทดสอบ Free Tier"
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setTier('coffee')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'coffee'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="ทดสอบ Tier เลี้ยงกาแฟ (99฿)"
            >
              ☕ 99฿
            </button>
            <button
              type="button"
              onClick={() => setTier('meal')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'meal'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="ทดสอบ Tier เลี้ยงข้าว (299฿)"
            >
              🍚 299฿
            </button>
          </div>

          {/* Current Status Badge */}
          {isPaid ? (
            <Link
              href="/donate"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{tier === 'coffee' ? 'สถานะ: เลี้ยงกาแฟ ☕' : 'สถานะ: เลี้ยงข้าว 🍚'}</span>
            </Link>
          ) : (
            <Link
              href="/donate"
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs sm:text-sm transition-colors flex items-center gap-1.5 font-medium"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>ดูสิทธิพิเศษ</span>
            </Link>
          )}
        </div>
      </div>

      {/* Engine Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
        {/* 1. Groq Cloud (Free / Default) */}
        <div
          onClick={() => {
            setProvider('groq');
            setShowKeyInput(false);
          }}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between h-full ${
            provider === 'groq' && !showKeyInput
              ? 'border-orange-500/80 bg-orange-500/10 ring-1 ring-orange-500/30'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
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
                    Groq Cloud (Whisper v3)
                  </span>
                </div>
              </div>
              {provider === 'groq' && !showKeyInput && (
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              )}
            </div>
            
            <div className="min-h-[2rem] flex items-center mt-2.5">
              <span className="text-xs text-orange-400 font-semibold leading-snug">
                {tier === 'free' ? 'ฟรี 5 คลิป/วัน (≤2 นาที, ≤100MB)' : '⚡ พร้อมใช้งานผ่านระบบ'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-3 leading-relaxed border-t border-zinc-800/60 pt-2.5 min-h-[3.75rem] flex items-start">
            ถอดเสียงภาษาไทยอัตโนมัติความเร็วสูง สำหรับคลิปความยาวไม่เกิน 2 นาที และขนาดไฟล์ไม่เกิน 100 MB
          </p>
        </div>

        {/* 2. BYOK (Groq API Key) */}
        <div
          onClick={() => {
            if (!isPaid) return; // Locked on Free tier
            setProvider('groq');
            setShowKeyInput(true);
          }}
          className={`relative p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between h-full ${
            !isPaid
              ? 'border-zinc-800/60 bg-zinc-950/20 opacity-80'
              : provider === 'groq' && showKeyInput
              ? 'border-emerald-500/80 bg-emerald-500/10 ring-1 ring-emerald-500/30 cursor-pointer'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
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
                    API Key ตัวเอง (BYOK)
                  </span>
                </div>
              </div>

              {!isPaid ? (
                <Link
                  href="/donate"
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:text-white transition-all whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>ดูวิธีปลดล็อก</span>
                </Link>
              ) : provider === 'groq' && showKeyInput ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : null}
            </div>

            <div className="min-h-[2rem] flex items-center mt-2.5">
              <span className="text-xs text-emerald-400 font-semibold leading-snug">
                {isPaid ? '⚡ ไม่จำกัดขนาด, ความยาว & จำนวนคลิป' : '🔒 ปลดล็อกเมื่อร่วมสนับสนุน'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-3 leading-relaxed border-t border-zinc-800/60 pt-2.5 min-h-[3.75rem] flex items-start">
            {isPaid
              ? 'ใส่ Groq API Key ส่วนตัว ถอดเสียงไม่จำกัดขนาดไฟล์ ไม่จำกัดความยาวคลิป และไม่จำกัดจำนวน ฟรีไม่มีค่าใช้จ่ายเพิ่ม'
              : 'ปลดล็อกเมื่อร่วมสนับสนุน: ถอดเสียงได้ไม่จำกัดขนาดไฟล์ ไม่จำกัดความยาว และไม่จำกัดจำนวนคลิป พร้อมใส่ API Key ตัวเอง'}
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
              ? 'border-indigo-500/80 bg-indigo-500/10 ring-1 ring-indigo-500/30 cursor-pointer'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
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
                    Local Whisper (Mac)
                  </span>
                </div>
              </div>

              {!isPaid ? (
                <Link
                  href="/donate"
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:text-white transition-all whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>ดูวิธีปลดล็อก</span>
                </Link>
              ) : provider === 'local' ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              ) : null}
            </div>

            <div className="min-h-[2rem] flex items-center mt-2.5">
              <span className="text-xs text-indigo-400 font-semibold leading-snug">
                {isPaid ? '🔒 Offline 100% ไม่จำกัด' : '🔒 ปลดล็อกเมื่อร่วมสนับสนุน'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-3 leading-relaxed border-t border-zinc-800/60 pt-2.5 min-h-[3.75rem] flex items-start">
            {isPaid
              ? 'ประมวลผลบนชิป Apple Silicon ออฟไลน์ 100% ไม่จำกัดขนาดและความยาวคลิป ข้อมูลปลอดภัยไม่หลุดออกนอกเครื่อง'
              : 'ปลดล็อกเมื่อร่วมสนับสนุน: ถอดเสียงในเครื่อง Mac ออฟไลน์ 100% ไม่จำกัดขนาดและความยาวคลิป ข้อมูลปลอดภัย'}
          </p>
        </div>
      </div>

      {/* BYOK Input Form (Only for Paid / Unlocked users) */}
      {isPaid && showKeyInput && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="password"
                placeholder="กรอก Groq API Key ของคุณ (gsk_...)"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-xl transition-colors whitespace-nowrap"
            >
              <Key className="w-4 h-4" />
              รับ API Key ฟรีที่นี่
            </a>
          </div>
          <p className="text-xs text-zinc-300 mt-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            API Key จะถูกเก็บในเบราว์เซอร์ของคุณเท่านั้น (ไม่ส่งไปบันทึกบนเซิร์ฟเวอร์ของเรา)
          </p>
        </div>
      )}
    </div>
  );
}
