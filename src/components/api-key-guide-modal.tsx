'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface ApiKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyGuideModal({ isOpen, onClose }: ApiKeyGuideModalProps) {
  const [expandedProvider, setExpandedProvider] = useState<'google' | 'openai' | 'groq' | null>('google');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                วิธีขอ API Key (BYOK)
              </h2>
              <p className="text-xs text-zinc-400">
                เลือกผู้ให้บริการ AI ถอดเสียงที่เหมาะกับการใช้งานของคุณ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 min-h-0">
          {/* 1. Google Cloud STT Guide Card */}
          <div
            className={`border rounded-2xl transition-all overflow-hidden ${
              expandedProvider === 'google'
                ? 'border-sky-500/60 bg-sky-950/15 ring-1 ring-sky-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div
              onClick={() =>
                setExpandedProvider(expandedProvider === 'google' ? null : 'google')
              }
              className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-100">
                      1. Google Cloud Speech-to-Text
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      🏆 ความแม่นยำภาษาไทยสูงสุด (ฟรี 60 นาที/เดือน)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    เครื่องยนต์เดียวกับที่ SUBTHAITLE ใช้เป็นหลัก ถอดเสียงภาษาไทยเป๊ะที่สุด มีโควต้าฟรีทุกเดือน
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-sky-400 font-medium">
                      🎁 ฟรี 60 นาทีแรกทุกเดือน (ส่วนเกิน ~0.54฿/นาที)
                    </span>
                    <span>• รหัสขึ้นต้นด้วย <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">AIza...</code></span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-zinc-400 mt-1">
                {expandedProvider === 'google' ? (
                  <ChevronUp className="w-5 h-5 text-sky-400" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Expandable Step-by-Step for Google Cloud */}
            {expandedProvider === 'google' && (
              <div className="px-5 pb-5 pt-1 border-t border-sky-500/20 text-xs space-y-3 animate-in fade-in duration-200">
                <p className="text-zinc-300 font-medium pt-2">
                  ขั้นตอนการขอ API Key จาก Google Cloud:
                </p>
                <ol className="space-y-2 text-zinc-300 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      เข้าไปที่{' '}
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline inline-flex items-center gap-0.5 hover:text-sky-300"
                      >
                        console.cloud.google.com <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      แล้วล็อกอินด้วยบัญชี Google
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      ไปที่เมนู <strong>APIs & Services &gt; Library</strong> ค้นหา <strong>&quot;Cloud Speech-to-Text API&quot;</strong> แล้วกด <strong>Enable</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      ไปที่เมนู <strong>Credentials</strong> กด <strong>+ CREATE CREDENTIALS &gt; API Key</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/30 text-sky-300 border border-sky-500/40 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <span className="text-sky-300 font-medium">
                      คัดลอกรหัส <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">AIza...</code> มาวางในช่อง <strong>&quot;API Key&quot;</strong> บนเว็บ SUBTHAITLE แล้วใช้งานได้ทันที!
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
          {/* OpenAI Guide Card */}
          <div
            className={`border rounded-2xl transition-all overflow-hidden ${
              expandedProvider === 'openai'
                ? 'border-emerald-500/60 bg-emerald-950/15 ring-1 ring-emerald-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div
              onClick={() =>
                setExpandedProvider(expandedProvider === 'openai' ? null : 'openai')
              }
              className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-100">
                      1. OpenAI Whisper (ตัวแท้)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🌟 แนะนำเพื่อความแม่นยำสูงสุด
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    ถอดเสียงภาษาไทยเป๊ะที่สุด 100% ไม่มีคำหลอนหรือข้อความตกหล่น
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      💰 เติมเงินขั้นต่ำ $5 (~170฿) คิด $0.006/นาที (~12฿/ชม.)
                    </span>
                    <span>• รหัสขึ้นต้นด้วย <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">sk-...</code></span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-zinc-400 mt-1">
                {expandedProvider === 'openai' ? (
                  <ChevronUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Expandable Step-by-Step for OpenAI */}
            {expandedProvider === 'openai' && (
              <div className="px-5 pb-5 pt-1 border-t border-emerald-500/20 text-xs space-y-3 animate-in fade-in duration-200">
                <p className="text-zinc-300 font-medium pt-2">
                  ขั้นตอนการขอ API Key จาก OpenAI:
                </p>
                <ol className="space-y-2 text-zinc-300 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      เข้าไปที่เว็บ{' '}
                      <a
                        href="https://platform.openai.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline inline-flex items-center gap-0.5 hover:text-emerald-300"
                      >
                        platform.openai.com <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      แล้วสมัครสมาชิกหรือเข้าสู่ระบบ
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      ไปที่เมนู <strong>Settings &gt; Billing</strong> ผูกบัตรเครดิต/เดบิต และเติมเงินขั้นต่ำ $5 (ประมาณ 170 บาท จะใช้ถอดเสียงได้ถึง 14 ชม.)
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      ไปที่เมนู <strong>API keys</strong> ทางแถบซ้ายมือ แล้วกดปุ่ม{' '}
                      <strong>+ Create new secret key</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      คัดลอกรหัสที่ขึ้นต้นด้วย <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">sk-...</code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      5
                    </span>
                    <span className="text-emerald-300 font-medium">
                      นำรหัส Key มาวางในช่อง <strong>&quot;API Key&quot;</strong> บนเว็บ SUBTHAITLE แล้วกดถอดเสียงได้ทันที!
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Groq Guide Card */}
          <div
            className={`border rounded-2xl transition-all overflow-hidden ${
              expandedProvider === 'groq'
                ? 'border-amber-500/60 bg-amber-950/15 ring-1 ring-amber-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div
              onClick={() =>
                setExpandedProvider(expandedProvider === 'groq' ? null : 'groq')
              }
              className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-100">
                      2. Groq Cloud (Whisper Large V3)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚡ ฟรี 100% (ประหยัด)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    ถอดเสียงเร็วปานสายฟ้า (1-2 วินาทีเสร็จ) และใช้งานได้ฟรี
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      ⚠️ อาจมีคำผิด/หลอน หรือเสียงหายในบางช่วง
                    </span>
                    <span>• รหัสขึ้นต้นด้วย <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">gsk_...</code></span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-zinc-400 mt-1">
                {expandedProvider === 'groq' ? (
                  <ChevronUp className="w-5 h-5 text-amber-400" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Expandable Step-by-Step for Groq */}
            {expandedProvider === 'groq' && (
              <div className="px-5 pb-5 pt-1 border-t border-amber-500/20 text-xs space-y-3 animate-in fade-in duration-200">
                <p className="text-zinc-300 font-medium pt-2">
                  ขั้นตอนการขอ API Key ฟรีจาก Groq:
                </p>
                <ol className="space-y-2 text-zinc-300 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      เข้าไปที่เว็บ{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 underline inline-flex items-center gap-0.5 hover:text-amber-300"
                      >
                        console.groq.com/keys <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      แล้วล็อกอินด้วย Google / GitHub
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      กดปุ่ม <strong>Create API Key</strong> ตั้งชื่อตามต้องการ แล้วกดยืนยัน
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      คัดลอกรหัสที่ขึ้นต้นด้วย <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">gsk_...</code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <span className="text-amber-300 font-medium">
                      นำรหัส Key มาวางในช่อง <strong>&quot;API Key&quot;</strong> บนเว็บ SUBTHAITLE แล้วกดถอดเสียงได้ทันที!
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ระบบจะ <strong>Auto-Detect</strong> ค่าย AI จากรหัส Key ที่คุณกรอกอัตโนมัติ
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
