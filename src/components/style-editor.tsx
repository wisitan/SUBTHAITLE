'use client';

import React from 'react';
import {
  Type,
  MoveVertical,
  Sun,
  Sparkles,
  RotateCcw,
  Check,
  Sliders,
  Space,
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

  const handleResetDefault = () => {
    setStyle(defaultCaptionStyle);
    setActivePresetId('default');
  };

  return (
    <div className="space-y-6 p-4 sm:p-5 text-zinc-100 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Header with Reset Default Button */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <span>ปรับแต่งสไตล์ซับไตเติล (Subtitle Styler)</span>
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            ปรับแต่งฟอนต์ ขนาด สี ระยะห่าง ตำแหน่ง และเอฟเฟกต์แบบเรียลไทม์
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefault}
          className="text-xs text-zinc-400 hover:text-orange-400 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
          title="รีเซ็ตค่ารูปแบบกลับเป็นค่าเริ่มต้น"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>คืนค่าเริ่มต้น</span>
        </button>
      </div>

      {/* 1. Font Picker Component */}
      <FontPicker
        selectedFont={style.fontFamily}
        onSelectFont={(fontFamily) => setStyle({ fontFamily })}
      />

      <hr className="border-zinc-800/80" />

      {/* 2. Typography & Color (Size, Weight, Color) */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Type className="w-4 h-4 text-orange-400" />
          <span>ขนาดและสีตัวอักษร (Typography & Color):</span>
        </h4>

        {/* Font Size Slider */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">ขนาดตัวอักษร (Font Size):</span>
            <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {style.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min={18}
            max={64}
            step={1}
            value={style.fontSize}
            aria-label="ขนาดตัวอักษร"
            onChange={(e) => setStyle({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>เล็ก (18px)</span>
            <span>ปานกลาง (32px)</span>
            <span>ใหญ่มาก (64px)</span>
          </div>
        </div>

        {/* Font Weight */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
          <span className="text-zinc-300 font-medium">ความหนาของตัวอักษร (Font Weight):</span>
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '500' })}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '500' || style.fontWeight === 'normal'
                  ? 'bg-orange-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ปกติ (Normal)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '700' })}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '700' || style.fontWeight === 'bold'
                  ? 'bg-orange-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ตัวหนา (Bold)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ fontWeight: '800' })}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                style.fontWeight === '800'
                  ? 'bg-orange-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              หนาพิเศษ
            </button>
          </div>
        </div>

        {/* Text Color Swatches */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
          <span className="text-xs text-zinc-300 font-medium block">
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
                    ? 'ring-2 ring-orange-500 scale-110 border-white'
                    : 'border-zinc-700 hover:scale-105'
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
                className="w-7 h-7 rounded-xl bg-transparent border border-zinc-700 cursor-pointer overflow-hidden"
              />
              <span className="text-xs font-mono text-zinc-400 uppercase">
                {style.textColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      {/* 3. Spacing Controls (ระยะห่างตัวอักษร & ระยะห่างบรรทัด) */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Space className="w-4 h-4 text-orange-400" />
          <span>ระยะห่างและการจัดวาง (Letter & Line Spacing):</span>
        </h4>

        {/* Letter Spacing (Tracking) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">ระยะห่างระหว่างตัวอักษร (Letter Spacing):</span>
            <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
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

          {/* Quick Letter Spacing Presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: -1 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              แนบชิด (-1px)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 0 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ปกติ (0px)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 1.5 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              กว้าง (1.5px)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ letterSpacing: 3 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              กว้างมาก (3px)
            </button>
          </div>
        </div>

        {/* Line Height (Leading) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">ระยะห่างระหว่างบรรทัด (Line Spacing / Height):</span>
            <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
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

          {/* Quick Line Height Presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.2 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              แคบ (1.2)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.4 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ปกติ (1.4)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.6 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              สบายตา (1.6)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ lineHeight: 1.9 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              โปร่ง (1.9)
            </button>
          </div>
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      {/* 4. Position & Placement (ตำแหน่งแนวตั้งแกน Y & แนวนอนแกน X) */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <MoveVertical className="w-4 h-4 text-orange-400" />
          <span>ตำแหน่งซับไตเติลบนหน้าจอ (Position & Alignment):</span>
        </h4>

        {/* Position Y (Up-Down) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">ตำแหน่งแนวตั้ง (ขึ้น - ลง จากขอบล่าง):</span>
            <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
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

          {/* Quick Position Presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ positionY: 10 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ล่างสุด (10%)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionY: 18 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              TikTok ฮิต (18%)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionY: 50 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              กึ่งกลาง (50%)
            </button>
          </div>
        </div>

        {/* Position X (Left-Right) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">ตำแหน่งแนวนอน (ซ้าย - ขวา):</span>
            <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
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

          {/* Quick Horizontal Presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStyle({ positionX: 20 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ชิดซ้าย (20%)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionX: 50 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ตรงกลาง (50%)
            </button>
            <button
              type="button"
              onClick={() => setStyle({ positionX: 80 })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              ชิดขวา (80%)
            </button>
          </div>
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      {/* 5. Shadow, Outline & Background Box (เงา ขอบ และกล่องพื้นหลัง) */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-orange-400" />
          <span>เงา ขอบ และกล่องพื้นหลัง (Shadow, Outline & Box):</span>
        </h4>

        {/* Drop Shadow Section */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-2 cursor-pointer">
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
                <span className="text-[10px] text-zinc-400">สีเงา:</span>
                <input
                  type="color"
                  value={style.shadowColor || '#000000'}
                  onChange={(e) => setStyle({ shadowColor: e.target.value })}
                  aria-label="เลือกสีเงา"
                  className="w-5 h-5 rounded-lg bg-transparent border border-zinc-700 cursor-pointer overflow-hidden"
                />
              </div>
            )}
          </div>

          {style.hasShadow && (
            <div className="space-y-2 pt-1 border-t border-zinc-900 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">ความฟุ้งของเงา (Blur):</span>
                <span className="font-mono text-orange-400">{style.shadowBlur}px</span>
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
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-2 cursor-pointer">
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
                <span className="text-[10px] text-zinc-400">สีขอบ:</span>
                <input
                  type="color"
                  value={style.outlineColor || '#000000'}
                  onChange={(e) => setStyle({ outlineColor: e.target.value })}
                  aria-label="เลือกสีเส้นขอบ"
                  className="w-5 h-5 rounded-lg bg-transparent border border-zinc-700 cursor-pointer overflow-hidden"
                />
              </div>
            )}
          </div>

          {style.hasOutline && (
            <div className="space-y-2 pt-1 border-t border-zinc-900 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">ความหนาเส้นขอบ (Width):</span>
                <span className="font-mono text-orange-400">{style.outlineWidth}px</span>
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

        {/* 🆕 Background Box Section (Color + Opacity Control) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(style.hasBackground)}
                onChange={(e) => setStyle({ hasBackground: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>กล่องพื้นหลังโปร่งใส (Background Box)</span>
            </label>

            {style.hasBackground && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                ทึบ {style.backgroundOpacity ?? 70}%
              </span>
            )}
          </div>

          {style.hasBackground && (
            <div className="space-y-3 pt-2 border-t border-zinc-900 text-xs">
              {/* Background Color Swatches */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-300 font-medium block">
                  เลือกสีพื้นหลัง (Box Color):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {BG_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStyle({ backgroundColor: c.hex })}
                      className={`w-6 h-6 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        (style.backgroundColor || '#000000').toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-orange-500 scale-110 border-white'
                          : 'border-zinc-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {(style.backgroundColor || '#000000').toLowerCase() === c.hex.toLowerCase() && (
                        <Check
                          className={`w-3 h-3 ${
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
                      className="w-6 h-6 rounded-lg bg-transparent border border-zinc-700 cursor-pointer overflow-hidden"
                    />
                    <span className="text-[11px] font-mono text-zinc-400 uppercase">
                      {style.backgroundColor || '#000000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Opacity Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">ความทึบแสง (Opacity):</span>
                  <span className="font-mono text-orange-400 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
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

                {/* Quick Opacity Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 40 })}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    โปร่ง 40%
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 65 })}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    โปร่ง 65%
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 85 })}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    ทึบ 85%
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyle({ backgroundOpacity: 100 })}
                    className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    ทึบ 100%
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      {/* 6. Word Highlight Styling */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>การปรับแต่ง Word Highlight (คำพูด Realtime):</span>
        </h4>

        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={style.enableWordHighlight}
                onChange={(e) => setStyle({ enableWordHighlight: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
              <span>เปิดใช้งาน Word Highlight</span>
            </label>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                style.enableWordHighlight
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {style.enableWordHighlight ? 'Active ON' : 'OFF'}
            </span>
          </div>

          {style.enableWordHighlight && (
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <span className="text-xs text-zinc-300 font-medium block">
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
                        ? 'ring-2 ring-orange-500 scale-110 border-white'
                        : 'border-zinc-700 hover:scale-105'
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
                    className="w-7 h-7 rounded-xl bg-transparent border border-zinc-700 cursor-pointer overflow-hidden"
                  />
                  <span className="text-xs font-mono text-zinc-400 uppercase">
                    {style.highlightColor}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
