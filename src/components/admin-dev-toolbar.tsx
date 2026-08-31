'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import {
  Wrench,
  Crown,
  Coins,
  RotateCcw,
  BookOpen,
  LogOut,
  X,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export function AdminDevToolbar() {
  const { user } = useAuth();
  const {
    isAdmin,
    setIsAdmin,
    setAdminToken,
    isLifetimeUnlocked,
    setLifetimeUnlocked,
    creditsMinutes,
    addCredits,
    setCreditsMinutes,
    resetQuotas,
    googleMonthlyUsageCount,
    groqDailyUsageCount,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isAdmin) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleLifetime = () => {
    const nextState = !isLifetimeUnlocked;
    setLifetimeUnlocked(nextState);
    showToast(
      nextState
        ? '👑 ปลดล็อก Lifetime Pass สำเร็จ! ใช้งาน BYOK และ Local AI ได้ทันที'
        : '🔒 ปิดสิทธิ์ Lifetime Pass แล้ว (ระบบจะจำลองเป็นผู้ใช้ปกติ)'
    );
  };

  const handleAddCredits = (minutes: number) => {
    addCredits(minutes);
    showToast(`🪙 เพิ่มเครดิต +${minutes} นาทีสำเร็จ (ยอดรวม: ${creditsMinutes + minutes} นาที)`);
  };

  const handleClearCredits = () => {
    setCreditsMinutes(0);
    showToast('🪙 ล้างเครดิตเป็น 0 นาทีเรียบร้อยแล้ว');
  };

  const handleResetQuotas = () => {
    resetQuotas(user?.id);
    showToast('🔄 รีเซ็ตโควต้าฟรี Google (5 คลิป) และ Groq (3 คลิป) สำเร็จ!');
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    setAdminToken(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Admin Trigger Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-2xl shadow-purple-900/50 border border-purple-400/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-in fade-in"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Wrench className="w-4 h-4 text-purple-200" />
          <span>Dev Sandbox</span>
        </button>
      </div>

      {/* Admin Control Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-950/95 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-950/50 space-y-5 text-zinc-100 relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Admin Dev Sandbox</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-900/50 text-[10px] font-mono text-purple-300 border border-purple-700/50">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    เครื่องมือจำลองสิทธิ์และทดสอบระบบสำหรับผู้พัฒนา
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toast feedback */}
            {toastMessage && (
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-semibold animate-in fade-in duration-200">
                {toastMessage}
              </div>
            )}

            {/* Control 1: Lifetime Pass Toggle (BYOK & Local AI Testing) */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-4 h-4 ${isLifetimeUnlocked ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">สิทธิ์ Lifetime Pass (699฿)</div>
                    <div className="text-[11px] text-zinc-400">
                      {isLifetimeUnlocked ? 'ปลดล็อก BYOK & Local AI แล้ว' : 'ล็อกโหมด BYOK (จำลองผู้ใช้ทั่วไป)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleLifetime}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isLifetimeUnlocked
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {isLifetimeUnlocked ? '🟢 ปลดล็อกอยู่' : '⚪ ปิดใช้งาน'}
                </button>
              </div>
            </div>

            {/* Control 2: Credit Adjustments */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-white">เครดิตจำลองในระบบ:</span>
                </div>
                <strong className="text-sm font-mono text-amber-400">
                  {creditsMinutes} นาที
                </strong>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCredits(60)}
                  className="py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-bold text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-orange-400" />
                  <span>60น.</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCredits(180)}
                  className="py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-bold text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-orange-400" />
                  <span>180น.</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCredits(500)}
                  className="py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-bold text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-orange-400" />
                  <span>500น.</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCredits}
                  className="py-1.5 px-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-[11px] font-bold text-rose-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span>ล้าง 0</span>
                </button>
              </div>
            </div>

            {/* Control 3: Free Quota Reset */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">โควต้าฟรีที่ใช้ไปแล้ว:</div>
                <div className="text-[11px] text-zinc-400">
                  Google: <span className="font-mono text-zinc-200">{googleMonthlyUsageCount}/5</span> • Groq:{' '}
                  <span className="font-mono text-zinc-200">{groqDailyUsageCount}/3</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetQuotas}
                className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>รีเซ็ตโควต้า</span>
              </button>
            </div>

            {/* Links & Exit */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <Link
                href="/admin/dictionary"
                onClick={() => setIsOpen(false)}
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>คลังคำศัพท์ (Dictionary)</span>
              </Link>

              <button
                type="button"
                onClick={handleLogoutAdmin}
                className="text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจาก Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminDevToolbar;
