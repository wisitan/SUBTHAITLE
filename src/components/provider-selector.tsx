'use client';

import React, { useState } from 'react';
import { useAppStore, TranscriptionProvider } from '@/lib/store';
import { Cloud, Key, Cpu, CheckCircle2, ShieldCheck } from 'lucide-react';

export function ProviderSelector() {
  const { provider, setProvider, tier, setTier, groqApiKey, setGroqApiKey } = useAppStore();
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSelect = (selected: TranscriptionProvider) => {
    setProvider(selected);
    if (selected === 'groq' && !showKeyInput) {
      // Default cloud free
    }
  };

  return (
    <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400" />
            ตัวเลือกเครื่องมือถอดเสียง (AI Engine)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            เลือกใช้งานระบบ Cloud มาตรฐาน หรือใส่ API Key เพื่อใช้งานไม่จำกัด
          </p>
        </div>

        {/* Tier switcher (for preview / activation) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTier('free')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              tier === 'free'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Free
          </button>
          <button
            type="button"
            onClick={() => setTier('coffee')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              tier === 'coffee'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ☕ 69฿
          </button>
          <button
            type="button"
            onClick={() => setTier('meal')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              tier === 'meal'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🍚 299฿
          </button>
        </div>
      </div>

      {/* Engine Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Groq Cloud (Free / Default) */}
        <div
          onClick={() => {
            handleSelect('groq');
            setShowKeyInput(false);
          }}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            provider === 'groq' && !showKeyInput
              ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-xs text-zinc-100 block">
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
          <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
            ถอดเสียงความเร็วสูง แม่นยำระดับคำ (Word-level timestamps) สูงสุด 2 นาที/คลิป
          </p>
        </div>

        {/* 2. BYOK (Groq API Key) */}
        <div
          onClick={() => {
            handleSelect('groq');
            setShowKeyInput(true);
          }}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            provider === 'groq' && showKeyInput
              ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-xs text-zinc-100 block">
                  ใช้ API Key ตัวเอง (BYOK)
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  ⚡ ไม่จำกัดความยาว/ขนาด
                </span>
              </div>
            </div>
            {provider === 'groq' && showKeyInput && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
            ใส่ Groq API Key ของตัวเอง ปลดล็อกถอดเสียงยาวกี่ชั่วโมงก็ได้ ฟรีไม่มีค่าบริการเพิ่ม
          </p>
        </div>

        {/* 3. Local Whisper Mode */}
        <div
          onClick={() => {
            handleSelect('local');
            setShowKeyInput(false);
          }}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            provider === 'local'
              ? 'border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-xs text-zinc-100 block">
                  Local Whisper (Mac M-Series)
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">
                  🔒 Offline 100% ปลอดภัย
                </span>
              </div>
            </div>
            {provider === 'local' && (
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
            ประมวลผลบนเครื่องผ่าน Python MLX Whisper ข้อมูลไม่หลุดออกนอกเครื่อง
          </p>
        </div>
      </div>

      {/* BYOK Input Form */}
      {showKeyInput && (
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
