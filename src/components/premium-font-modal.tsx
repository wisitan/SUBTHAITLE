'use client';

import React, { useState } from 'react';
import { Crown, Sparkles, X, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAppStore } from '@/lib/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fontName: string;
}

export function PremiumFontModal({ isOpen, onClose, fontName }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const setStyle = useAppStore((s) => s.setStyle);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgradeToPro = async () => {
    if (!user) {
      // Must sign in first
      await signInWithGoogle();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'tier_299',
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe');
      setIsLoading(false);
    }
  };

  const handleSwitchToFreeFont = () => {
    setStyle({ fontFamily: 'Noto Sans Thai' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#181824] border border-amber-500/50 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            👑 Premium Font Feature
          </span>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            ฟอนต์ &ldquo;{fontName}&rdquo; สงวนสิทธิ์สำหรับ Pro Creator
          </h3>

          <p className="text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
            คุณสามารถทดลองใช้งานและดูพรีวิวบนหน้าจอได้ฟรี แต่สำหรับการ <strong className="text-amber-300">Export ไฟล์ซับไตเติล (FCPXML/XML/SRT)</strong> หรือ <strong className="text-amber-300">เบิร์นวิดีโอ MP4</strong> จำเป็นต้องเป็นสมาชิกแพ็กเกจ Pro Creator (299฿) ค่ะ
          </p>
        </div>

        {/* Pro Benefits List */}
        <div className="p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/70 space-y-2.5 text-xs text-zinc-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ปลดล็อก Export และ Burn Subtitle ฟอนต์พรีเมียมทั้งหมด</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>บันทึก Custom Presets สไตล์ส่วนตัวได้สูงสุด <strong>20 แบบ</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ปลดล็อกโหมด BYOK ไม่จำกัดจำนวนและขนาดไฟล์</span>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-400 font-medium text-center">{errorMessage}</p>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleUpgradeToPro}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>ปลดล็อก Pro Creator (299฿ ผ่าน PromptPay)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSwitchToFreeFont}
            className="w-full py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            สลับกลับไปใช้ฟอนต์มาตรฐานฟรี (Noto Sans Thai)
          </button>
        </div>
      </div>
    </div>
  );
}
