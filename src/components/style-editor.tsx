'use client';

import React from 'react';
import {
  Type,
  MoveVertical,
  Sun,
  RotateCcw,
  Check,
  Sliders,
  Space,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Palette,
  Layers,
  Smartphone,
} from 'lucide-react';
import { useAppStore, defaultCaptionStyle } from '@/lib/store';
import { FontPicker } from './font-picker';

const COLOR_PALETTE = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Cyan', hex: '#38BDF8' },
  { name: 'Lime', hex: '#4ADE80' },
  { name: 'Rose', hex: '#FB7185' },
  { name: 'Purple', hex: '#C084FC' },
  { name: 'Black', hex: '#000000' },
];

const BG_COLOR_PALETTE = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Gray', hex: '#18181B' },
  { name: 'Navy Slate', hex: '#0F172A' },
  { name: 'Deep Indigo', hex: '#1E1B4B' },
  { name: 'Deep Amber', hex: '#451A03' },
  { name: 'White', hex: '#FFFFFF' },
];

const HIGHLIGHT_PALETTE = [
  { name: 'Neon Yellow', hex: '#FACC15' },
  { name: 'Neon Orange', hex: '#FF6B00' },
  { name: 'Neon Cyan', hex: '#00F0FF' },
  { name: 'Neon Green', hex: '#10B981' },
  { name: 'Neon Pink', hex: '#FF007F' },
  { name: 'Gold', hex: '#FFD700' },
];

export function StyleEditor() {
  const style = useAppStore((s) => s.style);
  const setStyle = useAppStore((s) => s.setStyle);
  const setActivePresetId = useAppStore((s) => s.setActivePresetId);
  const showTikTokSafeZone = useAppStore((s) => s.showTikTokSafeZone);
  const setShowTikTokSafeZone = useAppStore((s) => s.setShowTikTokSafeZone);

  const handleResetDefault = () => {
    setStyle(defaultCaptionStyle);
    setActivePresetId('default');
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto p-4 sm:p-5 text-zinc-100 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Header with Reset Default Button */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <span>ปรับแต่งสไตล์ซับไตเติล (Subtitle Styler)</span>
          </h3>
          <p className="text-xs text-zinc-300 mt-0.5">
            ปรับแต่งฟอนต์ ขนาด สี ระยะห่าง ตำแหน่ง และเอฟเฟกต์แบบเรียลไทม์
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefault}
          className="text-xs text-zinc-300 hover:text-orange-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 font-medium"
          title="รีเซ็ตค่ารูปแบบกลับเป็นค่าเริ่มต้น"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>คืนค่าเริ่มต้น</span>
        </button>
      </div>

      {/* 🔤 Tool Card 1: Font Picker Component */}
      <FontPicker
        selectedFont={style.fontFamily}
        onSelectFont={(fontFamily) => setStyle({ fontFamily })}
      />

      {/* 📏 Tool Card 2: Typography, Size & Weight */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
            <Type className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            ขนาดและความหนาตัวอักษร (Typography & Size):
          </h4>
        </div>

        {/* Font Size Slider */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">ขนาดตัวอักษร (Font Size):</span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={48}
            step={1}
            value={style.fontSize}
            aria-label="ขนาดตัวอักษร"
            onChange={(e) => setStyle({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-400 font-medium">
            <span>ซับหนัง (10px)</span>
            <span>มาตรฐาน (24px)</span>
            <span>ตัวใหญ่ (48px)</span>
          </div>

          {/* Quick Font Size Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ fontSize: 13 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.fontSize === 13
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ซับหนัง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(13px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontSize: 20 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.fontSize === 20
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">มาตรฐาน</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(20px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontSize: 28 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.fontSize === 28
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">อ่านสบาย</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(28px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontSize: 36 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.fontSize === 36
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ตัวใหญ่</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(36px)</span>
            </button>
          </div>
        </div>

        {/* Font Weight */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <span className="text-zinc-200 font-medium">ความหนาของตัวอักษร (Font Weight):</span>
          <div className="flex items-center gap-1 bg-[#14141e] p-1 rounded-xl border border-zinc-700">
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '500' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '500' || style.fontWeight === 'normal'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              ปกติ (Normal)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '700' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '700' || style.fontWeight === 'bold'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              ตัวหนา (Bold)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '800' })}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '800'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              หนาพิเศษ
            </button>
          </div>
        </div>
      </div>

      {/* 🎨 Tool Card 3: Text Color & Highlight */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-yellow-500 group-focus-within/card:text-zinc-950 transition-all">
            <Palette className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            สีข้อความและ Word Highlight (Colors & Highlight):
          </h4>
        </div>

        {/* Text Color Swatches */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-2.5 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <span className="text-sm text-zinc-200 font-medium block">
            สีข้อความหลัก (Text Color):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setStyle({ textColor: c.hex })}
                className={`w-7 h-7 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  style.textColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'ring-2 ring-orange-500 scale-110 border-white shadow-md'
                    : 'border-zinc-600 hover:border-zinc-400 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {style.textColor.toLowerCase() === c.hex.toLowerCase() && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      c.hex === '#FFFFFF' || c.hex === '#FACC15' || c.hex === '#4ADE80' || c.hex === '#38BDF8'
                        ? 'text-black'
                        : 'text-white'
                    }`}
                  />
                )}
              </button>
            ))}

            {/* Custom Color Input */}
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => setStyle({ textColor: e.target.value })}
                aria-label="เลือกสีข้อความหลัก"
                className="w-7 h-7 rounded-xl bg-transparent border border-zinc-600 cursor-pointer overflow-hidden"
              />
              <span className="text-xs font-mono text-zinc-300 uppercase">
                {style.textColor}
              </span>
            </div>
          </div>
        </div>

        {/* Word Highlight Box */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={style.enableWordHighlight}
                onChange={(e) => setStyle({ enableWordHighlight: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>เปิดใช้งานไฮไลท์คำตามเสียง (Word Highlight)</span>
            </label>

            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                style.enableWordHighlight
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {style.enableWordHighlight ? 'Active ON' : 'OFF'}
            </span>
          </div>

          {style.enableWordHighlight && (
            <div className="space-y-4 pt-3 border-t border-zinc-700/80">
              <div className="space-y-2">
                <span className="text-xs text-zinc-200 font-medium block">
                  เลือกสีไฮไลท์ของคำที่กำลังพูด (Highlight Color):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {HIGHLIGHT_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStyle({ highlightColor: c.hex })}
                      className={`w-7 h-7 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                        style.highlightColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-orange-500 scale-110 border-white shadow-md'
                          : 'border-zinc-600 hover:border-zinc-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {style.highlightColor.toLowerCase() === c.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                      )}
                    </button>
                  ))}

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="color"
                      value={style.highlightColor}
                      onChange={(e) => setStyle({ highlightColor: e.target.value })}
                      aria-label="เลือกสีไฮไลท์ของคำที่กำลังพูด"
                      className="w-7 h-7 rounded-xl bg-transparent border border-zinc-600 cursor-pointer overflow-hidden"
                    />
                    <span className="text-xs font-mono text-zinc-300 uppercase">
                      {style.highlightColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Pop-up Scale Control */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                    <span>ขยายขนาดคำไฮไลท์ (Pop-up Scale):</span>
                    {(style.highlightScale ?? 1.15) > 1.0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Dynamic
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-orange-400 font-bold">
                    {Math.round(((style.highlightScale ?? 1.15) - 1) * 100) === 0
                      ? 'ปกติ (1.0x)'
                      : `+${Math.round(((style.highlightScale ?? 1.15) - 1) * 100)}% (${(style.highlightScale ?? 1.15).toFixed(2)}x)`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.0"
                    max="1.35"
                    step="0.05"
                    value={style.highlightScale ?? 1.15}
                    onChange={(e) => setStyle({ highlightScale: parseFloat(e.target.value) })}
                    className="flex-1 accent-orange-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Quick Scale Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[
                    { label: 'ปกติ (1.0x)', val: 1.0 },
                    { label: 'กำลังสวย (+15%)', val: 1.15 },
                    { label: 'ป๊อปชัด (+25%)', val: 1.25 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setStyle({ highlightScale: p.val })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                        (style.highlightScale ?? 1.15) === p.val
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📐 Tool Card 4: Letter & Line Spacing */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
            <Space className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            ระยะห่างตัวอักษรและบรรทัด (Letter & Line Spacing):
          </h4>
        </div>

        {/* Letter Spacing (Tracking) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">ระยะห่างระหว่างตัวอักษร (Letter Spacing):</span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.letterSpacing ?? 0}px
            </span>
          </div>

          <input
            type="range"
            min={-2}
            max={8}
            step={0.5}
            value={style.letterSpacing ?? 0}
            aria-label="ระยะห่างระหว่างตัวอักษร"
            onChange={(e) => setStyle({ letterSpacing: parseFloat(e.target.value) })}
            className="w-full accent-orange-500 cursor-pointer"
          />

          {/* Quick Letter Spacing Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: -1 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.letterSpacing ?? 0) === -1
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">แนบชิด</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(-1px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 0 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.letterSpacing ?? 0) === 0
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ปกติ</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(0px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 1.5 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.letterSpacing ?? 0) === 1.5
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">กว้าง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(1.5px)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 3 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.letterSpacing ?? 0) === 3
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">กว้างมาก</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(3px)</span>
            </button>
          </div>
        </div>

        {/* Line Height (Leading) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">ระยะห่างระหว่างบรรทัด (Line Spacing / Height):</span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.lineHeight ?? 1.4}x
            </span>
          </div>

          <input
            type="range"
            min={1.0}
            max={2.4}
            step={0.1}
            value={style.lineHeight ?? 1.4}
            aria-label="ระยะห่างระหว่างบรรทัด"
            onChange={(e) => setStyle({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-orange-500 cursor-pointer"
          />

          {/* Quick Line Height Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.2 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.lineHeight ?? 1.4) === 1.2
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">แคบ</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(1.2x)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.4 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.lineHeight ?? 1.4) === 1.4
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ปกติ</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(1.4x)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.6 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.lineHeight ?? 1.4) === 1.6
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">สบายตา</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(1.6x)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.9 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.lineHeight ?? 1.4) === 1.9
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">โปร่ง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(1.9x)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 Tool Card 5: Placement, Alignment & Width */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-purple-500 group-focus-within/card:text-zinc-950 transition-all">
            <MoveVertical className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            ตำแหน่ง จัดแนว และระยะขอบข้าง (Placement & Width):
          </h4>
        </div>

        {/* Text Alignment (Left / Center / Right) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <span className="text-zinc-200 font-medium">การจัดแนวข้อความ (Text Alignment):</span>
          <div className="flex items-center gap-1 bg-[#14141e] p-1 rounded-xl border border-zinc-700">
            <button
              type="button"
              onClick={() => setStyle({ textAlign: 'left' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                style.textAlign === 'left'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
              title="จัดข้อความชิดซ้าย"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>ชิดซ้าย</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ textAlign: 'center' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                !style.textAlign || style.textAlign === 'center'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
              title="จัดข้อความกึ่งกลาง"
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span>กึ่งกลาง</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ textAlign: 'right' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                style.textAlign === 'right'
                  ? 'bg-orange-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
              title="จัดข้อความชิดขวา"
            >
              <AlignRight className="w-3.5 h-3.5" />
              <span>ชิดขวา</span>
            </button>
          </div>
        </div>

        {/* Subtitle Max Width & Side Margins */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-orange-400" />
              <span>ความกว้างสูงสุด / ระยะขอบข้าง (Width & Margins):</span>
            </span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.maxWidth ?? 92}%
            </span>
          </div>

          <input
            type="range"
            min={60}
            max={98}
            step={1}
            value={style.maxWidth ?? 92}
            aria-label="ความกว้างสูงสุดของแถบซับไตเติล"
            onChange={(e) => setStyle({ maxWidth: parseInt(e.target.value, 10) })}
            className="w-full accent-orange-500 cursor-pointer"
          />

          {/* Quick Width Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ maxWidth: 70 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.maxWidth ?? 92) === 70
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">แคบ</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(70%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ maxWidth: 85 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.maxWidth ?? 92) === 85
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">มาตรฐาน</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(85%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ maxWidth: 92 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.maxWidth ?? 92) === 92
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">กว้าง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(92%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ maxWidth: 98 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                (style.maxWidth ?? 92) === 98
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">เต็มจอ</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(98%)</span>
            </button>
          </div>
          <p className="text-xs text-zinc-300 pt-0.5">
            💡 เพิ่มความกว้างเพื่อให้ข้อความขยายออกด้านข้างได้เต็มจอ และลดการตัดขึ้นบรรทัดใหม่
          </p>
        </div>

        {/* Position Y (Up-Down) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">ตำแหน่งแนวตั้ง (ขึ้น - ลง จากขอบล่าง):</span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.positionY}%
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={85}
            step={1}
            value={style.positionY}
            aria-label="ระยะห่างจากขอบล่าง"
            onChange={(e) => setStyle({ positionY: parseInt(e.target.value, 10) })}
            className="w-full accent-orange-500 cursor-pointer"
          />

          {/* Quick Position Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ positionY: 10 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionY === 10
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ล่างสุด</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(10%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionY: 18 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionY === 18
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">TikTok ฮิต</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(18%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionY: 50 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionY === 50
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">กึ่งกลาง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(50%)</span>
            </button>
          </div>

          {/* TikTok Safe Zone Guide Quick Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowTikTokSafeZone(!showTikTokSafeZone)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                showTikTokSafeZone
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30'
                  : 'bg-[#181824] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${showTikTokSafeZone ? 'text-orange-400' : 'text-zinc-400'}`} />
              <span>แสดงขอบเขต TikTok Safe Zone: {showTikTokSafeZone ? 'เปิดอยู่ (ON)' : 'ปิดอยู่ (OFF)'}</span>
            </button>
          </div>
        </div>

        {/* Position X (Left-Right) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">ตำแหน่งแนวนอน (ซ้าย - ขวา):</span>
            <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
              {style.positionX}%
            </span>
          </div>

          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={style.positionX}
            aria-label="ตำแหน่งแนวนอน ซ้าย-ขวา"
            onChange={(e) => setStyle({ positionX: parseInt(e.target.value, 10) })}
            className="w-full accent-orange-500 cursor-pointer"
          />

          {/* Quick Horizontal Presets (Uniform 2-Line Layout) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ positionX: 20 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionX === 20
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ชิดซ้าย</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(20%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionX: 50 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionX === 50
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ตรงกลาง</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(50%)</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionX: 80 })}
              className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                style.positionX === 80
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                  : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">ชิดขวา</span>
              <span className="block text-[11px] opacity-85 font-mono leading-tight">(80%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔲 Tool Card 6: Shadow & Outline */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-teal-500 group-focus-within/card:text-zinc-950 transition-all">
            <Sun className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            เงาและเส้นขอบตัวอักษร (Shadow & Stroke Outline):
          </h4>
        </div>

        {/* Drop Shadow Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={style.hasShadow}
                onChange={(e) => setStyle({ hasShadow: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>เปิดใช้งานเงา (Drop Shadow)</span>
            </label>

            {style.hasShadow && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-300">สีเงา:</span>
                <input
                  type="color"
                  value={style.shadowColor || '#000000'}
                  onChange={(e) => setStyle({ shadowColor: e.target.value })}
                  aria-label="เลือกสีเงา"
                  className="w-6 h-6 rounded-lg bg-transparent border border-zinc-600 cursor-pointer overflow-hidden"
                />
              </div>
            )}
          </div>

          {style.hasShadow && (
            <div className="space-y-2 pt-1 border-t border-zinc-700/80 text-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">ความฟุ้งของเงา (Blur):</span>
                <span className="font-mono text-orange-300 font-bold bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/40 text-xs">{style.shadowBlur}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={style.shadowBlur}
                aria-label="ความฟุ้งของเงา"
                onChange={(e) => setStyle({ shadowBlur: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Outline Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={style.hasOutline}
                onChange={(e) => setStyle({ hasOutline: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>เปิดใช้งานเส้นขอบ (Text Outline / Stroke)</span>
            </label>

            {style.hasOutline && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-300">สีขอบ:</span>
                <input
                  type="color"
                  value={style.outlineColor || '#000000'}
                  onChange={(e) => setStyle({ outlineColor: e.target.value })}
                  aria-label="เลือกสีเส้นขอบ"
                  className="w-6 h-6 rounded-lg bg-transparent border border-zinc-600 cursor-pointer overflow-hidden"
                />
              </div>
            )}
          </div>

          {style.hasOutline && (
            <div className="space-y-2 pt-1 border-t border-zinc-700/80 text-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">ความหนาเส้นขอบ (Width):</span>
                <span className="font-mono text-orange-300 font-bold bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/40 text-xs">{style.outlineWidth}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={style.outlineWidth}
                aria-label="ความหนาเส้นขอบ"
                onChange={(e) => setStyle({ outlineWidth: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* 📦 Tool Card 7: Background Box & Opacity */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-700/70">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-sky-500 group-focus-within/card:text-zinc-950 transition-all">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white">
            กล่องพื้นหลังซับไตเติล (Background Box & Opacity):
          </h4>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 space-y-3 hover:border-zinc-500/80 focus-within:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(style.hasBackground)}
                onChange={(e) => setStyle({ hasBackground: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>เปิดใช้งานกล่องพื้นหลัง (Background Box)</span>
            </label>

            {style.hasBackground && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm">
                ทึบ {style.backgroundOpacity ?? 70}%
              </span>
            )}
          </div>

          {style.hasBackground && (
            <div className="space-y-3 pt-2 border-t border-zinc-700/80 text-sm">
              {/* Background Color Swatches */}
              <div className="space-y-1.5">
                <span className="text-xs text-zinc-200 font-medium block">
                  เลือกสีพื้นหลัง (Box Color):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {BG_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStyle({ backgroundColor: c.hex })}
                      className={`w-7 h-7 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        (style.backgroundColor || '#000000').toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-orange-500 scale-110 border-white shadow-md'
                          : 'border-zinc-600 hover:border-zinc-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {(style.backgroundColor || '#000000').toLowerCase() === c.hex.toLowerCase() && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            c.hex === '#FFFFFF' ? 'text-black' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}

                  {/* Custom Background Color Picker */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="color"
                      value={style.backgroundColor || '#000000'}
                      onChange={(e) => setStyle({ backgroundColor: e.target.value })}
                      aria-label="เลือกสีพื้นหลังกล่องซับไตเติล"
                      className="w-7 h-7 rounded-lg bg-transparent border border-zinc-600 cursor-pointer overflow-hidden"
                    />
                    <span className="text-xs font-mono text-zinc-300 uppercase">
                      {style.backgroundColor || '#000000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Opacity Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">ความทึบแสง (Opacity):</span>
                  <span className="font-mono text-orange-300 font-bold bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/40 text-xs shadow-sm">
                    {style.backgroundOpacity ?? 70}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={style.backgroundOpacity ?? 70}
                  aria-label="ความทึบแสงของกล่องพื้นหลัง"
                  onChange={(e) => setStyle({ backgroundOpacity: parseInt(e.target.value, 10) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />

                {/* Quick Opacity Presets (Uniform 2-Line Layout) */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 40 })}
                    className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                      (style.backgroundOpacity ?? 70) === 40
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                        : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">โปร่งแสง</span>
                    <span className="block text-[11px] opacity-85 font-mono leading-tight">(40%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 65 })}
                    className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                      (style.backgroundOpacity ?? 70) === 65
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                        : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">ปานกลาง</span>
                    <span className="block text-[11px] opacity-85 font-mono leading-tight">(65%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 85 })}
                    className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                      (style.backgroundOpacity ?? 70) === 85
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                        : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">ทึบแสง</span>
                    <span className="block text-[11px] opacity-85 font-mono leading-tight">(85%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 100 })}
                    className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center min-h-[46px] transition-colors cursor-pointer ${
                      (style.backgroundOpacity ?? 70) === 100
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/40'
                        : 'bg-[#242434] border-zinc-700 hover:bg-[#2e2e42] hover:border-orange-400 text-zinc-100 shadow-sm'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">ทึบ 100%</span>
                    <span className="block text-[11px] opacity-85 font-mono leading-tight">(100%)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
