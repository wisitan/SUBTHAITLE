'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Cpu,
  Laptop,
  Monitor,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean | null;
}

export function LocalServerModal({ isOpen, onClose, isOnline }: Props) {
  const [activeTab, setActiveTab] = useState<'mac' | 'windows'>('mac');

  // Auto-detect OS on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) {
        setActiveTab('windows');
      } else {
        setActiveTab('mac');
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>วิธีเปิดใช้งาน Local Whisper Server</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                ถอดเสียงภาษาไทยออฟไลน์บนเครื่องคุณ 100% ฟรีตลอดชีพ ไม่จำกัดขนาดและความยาว
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Server Status Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              {isOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </span>
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-zinc-200">
                สถานะเซิร์ฟเวอร์ในเครื่อง (localhost:8765):{' '}
              </span>
              <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isOnline ? '🟢 กำลังออนไลน์ พร้อมใช้งาน' : '🔴 ยังไม่ได้เปิดเซิร์ฟเวอร์'}
              </span>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors shrink-0"
            >
              เริ่มใช้งานเลย
            </button>
          )}
        </div>

        {/* OS Tabs */}
        <div className="flex items-center gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('mac')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'mac'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-indigo-400" />
            <span>macOS (Apple Silicon M1/M2/M3/M4)</span>
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'windows'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>Windows (PC / NVIDIA GPU)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 scrollbar-thin">
          {activeTab === 'mac' ? (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>ดาวน์โหลดตัวรัน Local Server สำหรับ Mac</span>
                </div>
                <p className="text-xs text-zinc-400 ml-8">
                  ไฟล์ขนาดเล็กมาก (~5 KB) รวมสคริปต์อัตโนมัติสำหรับ Apple Silicon
                </p>
                <div className="ml-8 pt-1">
                  <a
                    href="/downloads/subthaitle-local-mac.zip"
                    download="subthaitle-local-mac.zip"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>📥 ดาวน์โหลด subthaitle-local-mac.zip</span>
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>แตกไฟล์ ZIP และดับเบิลคลิกไฟล์</span>
                </div>
                <div className="ml-8 space-y-1.5 text-xs text-zinc-300">
                  <p>
                    • ดับเบิลคลิกที่ไฟล์ <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono">start_server.command</code>
                  </p>
                  <p className="text-zinc-400 leading-relaxed">
                    *(ครั้งแรกระบบจะดาวน์โหลดโมเดล AI และติดตั้งอัตโนมัติ เมื่อเสร็จแล้วจะมีข้อความสีเขียวขึ้น)*
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>กลับมาที่หน้าเว็บนี้ และเริ่มถอดเสียงได้ทันที!</span>
                </div>
                <p className="text-xs text-zinc-400 ml-8">
                  ไฟสถานะด้านบนจะเปลี่ยนเป็นสีเขียว 🟢 อัตโนมัติ สามารถลากวิดีโอมาถอดเสียงได้แบบไม่จำกัดเลยค่ะ
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>ดาวน์โหลดตัวรัน Local Server สำหรับ Windows</span>
                </div>
                <p className="text-xs text-zinc-400 ml-8">
                  ไฟล์ขนาดเล็ก (~5 KB) รองรับการ์ดจอ NVIDIA และ CPU ด้วย faster-whisper
                </p>
                <div className="ml-8 pt-1">
                  <a
                    href="/downloads/subthaitle-local-windows.zip"
                    download="subthaitle-local-windows.zip"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg hover:shadow-blue-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>📥 ดาวน์โหลด subthaitle-local-windows.zip</span>
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>แตกไฟล์ ZIP และดับเบิลคลิกไฟล์</span>
                </div>
                <div className="ml-8 space-y-1.5 text-xs text-zinc-300">
                  <p>
                    • ดับเบิลคลิกที่ไฟล์ <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 font-mono">start_server.bat</code>
                  </p>
                  <p className="text-zinc-400 leading-relaxed">
                    *(ต้องการ Python 3.9+ ที่ติดตั้งไว้ในเครื่องพร้อมเลือก Add to PATH)*
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>กลับมาที่หน้าเว็บนี้ และเริ่มถอดเสียงได้ทันที!</span>
                </div>
                <p className="text-xs text-zinc-400 ml-8">
                  ไฟสถานะด้านบนจะเปลี่ยนเป็นสีเขียว 🟢 อัตโนมัติ สามารถลากวิดีโอมาถอดเสียงได้แบบไม่จำกัดเลยค่ะ
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ข้อมูลเสียงทั้งหมดจะถูกประมวลผลภายในเครื่องของคุณ 100%
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
