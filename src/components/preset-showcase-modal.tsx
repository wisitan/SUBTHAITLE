'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Check,
  Lock,
  Crown,
  Heart,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { SUBTITLE_PRESETS, StylePreset } from '@/lib/presets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: StylePreset) => void;
}

export function PresetShowcaseModal({ isOpen, onClose, onSelectPreset }: Props) {
  const [mounted, setMounted] = useState(false);
  const activePresetId = useAppStore((s) => s.activePresetId);
  const setStyle = useAppStore((s) => s.setStyle);
  const setActivePresetId = useAppStore((s) => s.setActivePresetId);
  const { isPro } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApply = (preset: StylePreset) => {
    setStyle(preset.style);
    setActivePresetId(preset.id);
    onSelectPreset?.(preset);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl my-auto max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4.5 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  10 พรีเมียมพรีเซ็ตซับไตเติล (Preset Showcase)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold">
                  Tier 299฿
                </span>
              </div>
              <p className="text-sm text-zinc-300 mt-0.5">
                สไตล์ตัวอักษรยอดนิยมที่คัดสรรมาให้พร้อมใช้สำหรับ Content Creator ทุกแพลตฟอร์ม
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable Grid of 10 Presets */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Banner CTA for Non-Paid Users */}
          {!isPro && (
            <div className="p-4.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-300">
                    ปลดล็อกพรีเซ็ตระดับพรีเมียมครบทั้ง 10 แบบ!
                  </h3>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    ร่วมสนับสนุนค่ากาแฟหรือเลี้ยงข้าวพี่เอ เพื่อปลดล็อกพรีเซ็ตสำเร็จรูป บันทึกสไตล์ไม่อั้น และ Export 4K Ultra HD
                  </p>
                </div>
              </div>
              <Link
                href="/donate"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 shrink-0 transition-transform hover:scale-105"
              >
                <Heart className="w-3.5 h-3.5 fill-zinc-950" />
                <span>ร่วมสนับสนุน ฿299</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Grid of 10 Presets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBTITLE_PRESETS.map((preset) => {
              const unlocked = true;
              const isActive = activePresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  className={`group relative rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : unlocked
                      ? 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-950/80 border-zinc-800/80 opacity-85'
                  }`}
                >
                  {/* Preset Info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                            {preset.name}
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-black">
                              ใช้งานอยู่
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      {/* Lock / Unlock Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                          unlocked
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>พร้อมใช้</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Tier 299฿</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Visual Preview Box */}
                    <div
                      className={`w-full py-5 px-4 rounded-xl border border-zinc-800/80 flex items-center justify-center text-center overflow-hidden shadow-inner ${
                        preset.style.hasBackground
                          ? 'bg-zinc-900'
                          : 'bg-gradient-to-b from-zinc-900 to-black'
                      }`}
                    >
                      <p
                        className="inline-block px-3 py-1 rounded-lg transition-all"
                        style={{
                          fontFamily: `"${preset.style.fontFamily}", sans-serif`,
                          fontSize: `${preset.style.fontSize}px`,
                          color: preset.style.textColor,
                          fontWeight: preset.style.fontWeight as React.CSSProperties['fontWeight'],
                          letterSpacing: `${preset.style.letterSpacing ?? 0}px`,
                          backgroundColor: preset.style.hasBackground
                            ? preset.style.backgroundColor || '#000000'
                            : 'transparent',
                          opacity: 1,
                          textShadow: preset.style.hasShadow
                            ? `0 4px ${preset.style.shadowBlur || 8}px ${preset.style.shadowColor || '#000000'}`
                            : 'none',
                        }}
                      >
                        <span>สวัสดีครับ </span>
                        <span
                          style={{
                            color: preset.style.highlightColor || '#FACC15',
                            fontWeight: 800,
                          }}
                        >
                          SUBTHAITLE
                        </span>
                        <span> มาแล้ว!</span>
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 text-xs font-mono">
                        Font: {preset.style.fontFamily}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 text-xs font-mono">
                        Size: {preset.style.fontSize}px
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 text-xs flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: preset.style.highlightColor }}
                        />
                        <span>Highlight</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-zinc-800/60 flex items-center justify-end">
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => handleApply(preset)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isActive ? 'กำลังใช้งาน' : 'เลือกใช้พรีเซ็ตนี้'}</span>
                      </button>
                    ) : (
                      <Link
                        href="/donate"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-amber-500/20 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>ปลดล็อกใน Tier 299฿</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-sm text-zinc-300">
          <span>🎨 พรีเซ็ตทั้งหมด 10 สไตล์ (อัปเดตใหม่อย่างต่อเนื่อง)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium transition-colors cursor-pointer text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
