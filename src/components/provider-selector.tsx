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
    <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400" />
            <span>เครื่องมือถอดเสียง (AI Engine)</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            ประมวลผลเสียงภาษาไทยความเร็วสูง แม่นยำระดับคำ (Word-level timestamps)
          </p>
        </div>

        {/* Tier Status & Quick Dev Testing Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Tier Switcher for Testing */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800 text-[11px]">
            <FlaskConical className="w-3 h-3 text-amber-400 mr-0.5" />
            <span className="text-zinc-500 hidden sm:inline mr-1">โหมดทดสอบ:</span>
            <button
              type="button"
              onClick={() => setTier('free')}
              className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'free'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="ทดสอบ Free Tier"
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setTier('coffee')}
              className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'coffee'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="ทดสอบ Tier เลี้ยงกาแฟ (99฿)"
            >
              ☕ 99฿
            </button>
            <button
              type="button"
              onClick={() => setTier('meal')}
              className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                tier === 'meal'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
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
              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{tier === 'coffee' ? 'สถานะ: เลี้ยงกาแฟ ☕' : 'สถานะ: เลี้ยงข้าว 🍚'}</span>
            </Link>
          ) : (
            <Link
              href="/donate"
              className="px-2.5 py-1 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors flex items-center gap-1.5"
            >
              <Heart className="w-3 h-3 text-rose-400" />
              <span>ดูสิทธิพิเศษการสนับสนุน</span>
            </Link>
          )}
        </div>
      </div>

      {/* Engine Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Groq Cloud (Free / Default) */}
        <div
          onClick={() => {
            setProvider('groq');
            setShowKeyInput(false);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            provider === 'groq' && !showKeyInput
              ? 'border-orange-500/80 bg-orange-500/10 ring-1 ring-orange-500/30'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-zinc-100 block">
                  Groq Cloud (Whisper v3)
                </span>
                <span className="text-[10px] text-orange-400 font-medium">
                  {tier === 'free' ? 'ฟรี 5 คลิป/วัน' : 'ใช้งานผ่านระบบ'}
                </span>
              </div>
            </div>
            {provider === 'groq' && !showKeyInput && (
              <CheckCircle2 className="w-4 h-4 text-orange-400" />
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
            ถอดเสียงภาษาไทยอัตโนมัติความเร็วสูง ไม่ต้องตั้งค่าใดๆ พร้อมใช้งานทันที
          </p>
        </div>

        {/* 2. BYOK (Groq API Key) */}
        <div
          onClick={() => {
            if (!isPaid) return; // Locked on Free tier
            setProvider('groq');
            setShowKeyInput(true);
          }}
          className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            !isPaid
              ? 'border-zinc-800/60 bg-zinc-950/20 opacity-75'
              : provider === 'groq' && showKeyInput
              ? 'border-emerald-500/80 bg-emerald-500/10 ring-1 ring-emerald-500/30 cursor-pointer'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-zinc-100 block">
                  API Key ตัวเอง (BYOK)
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {isPaid ? '⚡ ไม่จำกัดจำนวน & ความยาวคลิป' : '🔒 ปลดล็อกเมื่อร่วมสนับสนุน'}
                </span>
              </div>
            </div>

            {!isPaid ? (
              <Link
                href="/donate"
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:text-white transition-all whitespace-nowrap"
              >
                <Lock className="w-3 h-3 text-rose-400" />
                <span>ดูวิธีปลดล็อก</span>
              </Link>
            ) : provider === 'groq' && showKeyInput ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
            {isPaid
              ? 'ใส่ Groq API Key ส่วนตัว ถอดเสียงไม่จำกัดจำนวนคลิปและไม่จำกัดความยาว ฟรีไม่มีค่าใช้จ่ายเพิ่ม'
              : 'ปลดล็อกเมื่อร่วมสนับสนุน: ถอดเสียงได้ไม่จำกัดจำนวนคลิปและไม่จำกัดความยาวคลิป พร้อมใส่ API Key ของคุณเอง'}
          </p>
        </div>

        {/* 3. Local Whisper Mode */}
        <div
          onClick={() => {
            if (!isPaid) return;
            handleSelect('local');
          }}
          className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            !isPaid
              ? 'border-zinc-800/60 bg-zinc-950/20 opacity-75'
              : provider === 'local'
              ? 'border-indigo-500/80 bg-indigo-500/10 ring-1 ring-indigo-500/30 cursor-pointer'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-zinc-100 block">
                  Local Whisper (Mac)
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">
                  {isPaid ? '🔒 Offline 100% ไม่จำกัดคลิป' : '🔒 ปลดล็อกเมื่อร่วมสนับสนุน'}
                </span>
              </div>
            </div>

            {!isPaid ? (
              <Link
                href="/donate"
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:text-white transition-all whitespace-nowrap"
              >
                <Lock className="w-3 h-3 text-rose-400" />
                <span>ดูวิธีปลดล็อก</span>
              </Link>
            ) : provider === 'local' ? (
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
            {isPaid
              ? 'ประมวลผลบนชิป Apple Silicon ออฟไลน์ 100% ไม่จำกัดจำนวนคลิปและความยาว ข้อมูลปลอดภัยไม่หลุดออกนอกเครื่อง'
              : 'ปลดล็อกเมื่อร่วมสนับสนุน: ถอดเสียงในเครื่อง Mac ออฟไลน์ 100% ไม่จำกัดจำนวนคลิปและความยาว ข้อมูลปลอดภัย'}
          </p>
        </div>
      </div>

      {/* BYOK Input Form (Only for Paid / Unlocked users) */}
      {isPaid && showKeyInput && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="password"
                placeholder="กรอก Groq API Key ของคุณ (gsk_...)"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-xl transition-colors whitespace-nowrap"
            >
              <Key className="w-3.5 h-3.5" />
              รับ API Key ฟรีที่นี่
            </a>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
            API Key จะถูกเก็บในเบราว์เซอร์ของคุณเท่านั้น (ไม่ส่งไปบันทึกบนเซิร์ฟเวอร์ของเรา)
          </p>
        </div>
      )}
    </div>
  );
}
