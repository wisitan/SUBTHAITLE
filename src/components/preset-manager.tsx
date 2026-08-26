'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Bookmark,
  Lock,
  Layers,
} from 'lucide-react';
import { useAppStore, CaptionStyle } from '@/lib/store';
import { SUBTITLE_PRESETS } from '@/lib/presets';

export function PresetManager() {
  const setStyle = useAppStore((s) => s.setStyle);
  const activePresetId = useAppStore((s) => s.activePresetId);
  const setActivePresetId = useAppStore((s) => s.setActivePresetId);
  const customPresets = useAppStore((s) => s.customPresets);
  const saveCustomPreset = useAppStore((s) => s.saveCustomPreset);
  const deleteCustomPreset = useAppStore((s) => s.deleteCustomPreset);
  const tier = useAppStore((s) => s.tier);

  const [presetNameInput, setPresetNameInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    saveCustomPreset(presetNameInput.trim());
    showToast(`บันทึก Preset "${presetNameInput.trim()}" เรียบร้อยแล้ว 🎉`);
    setPresetNameInput('');
  };

  const handleApplyPreset = (id: string, presetStyle: CaptionStyle) => {
    setStyle(presetStyle);
    setActivePresetId(id);
    showToast('ปรับใช้สไตล์ Preset เรียบร้อย');
  };

  return (
    <div className="space-y-6 p-4 sm:p-5 text-zinc-100 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Toast */}
      {toastMsg && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Save Current Style Card */}
      <form onSubmit={handleSaveCurrent} className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-orange-400" />
            <span>บันทึกสไตล์ปัจจุบันเป็น Custom Preset:</span>
          </h4>
          <span className="text-[10px] text-zinc-400">บันทึกเก็บไว้ในเครื่องของคุณ</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ตั้งชื่อสไตล์ของคุณ เช่น สไตล์ TikTok ประจำตัว..."
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึก Preset</span>
          </button>
        </div>
      </form>

      {/* 2. User's Custom Presets Box */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Preset กำหนดเองของคุณ ({customPresets.length}):</span>
          </h4>
        </div>

        {customPresets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800 text-center space-y-1">
            <p className="text-xs text-zinc-400 font-medium">ยังไม่มี Custom Preset ที่คุณบันทึกไว้</p>
            <p className="text-[11px] text-zinc-500">ปรับแต่งฟอนต์และสีในแท็บ &quot;สไตล์&quot; แล้วพิมพ์ชื่อกดบันทึกด้านบนได้เลยค่ะ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {customPresets.map((cp) => {
              const isSelected = activePresetId === cp.id;

              return (
                <div
                  key={cp.id}
                  onClick={() => handleApplyPreset(cp.id, cp.style)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate max-w-[150px]">
                      {cp.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomPreset(cp.id);
                          showToast(`ลบ Preset "${cp.name}" แล้ว`);
                        }}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="ลบ Preset นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: cp.style.textColor }}
                    />
                    <span className="text-[10px] text-zinc-500">➔</span>
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: cp.style.highlightColor }}
                    />
                    <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                      {cp.style.fontFamily} ({cp.style.fontSize}px)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <hr className="border-zinc-800/80" />

      {/* 3. 1-Click System Presets List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ธีมสำเร็จรูปของระบบ (1-Click Presets):</span>
          </h4>
          <span className="text-[10px] text-zinc-400">คลิกเพื่อ Live Preview ทันที</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUBTITLE_PRESETS.map((preset, idx) => {
            const isSelected = activePresetId === preset.id;
            // Tier simulation logic
            const isFreePreset = idx < 2; // Free gets 2
            const isCoffeePreset = idx < 4; // Coffee gets 4
            const isMealPreset = true; // Meal gets all

            const hasAccess =
              tier === 'meal'
                ? isMealPreset
                : tier === 'coffee'
                ? isCoffeePreset
                : isFreePreset;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id, preset.style)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group relative ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-white group-hover:text-orange-300 transition-colors">
                    {preset.name}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!hasAccess && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Donate Tier</span>
                      </span>
                    )}

                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-snug">
                  {preset.description}
                </p>

                {/* Visual Swatch */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.previewTextColor }}
                  />
                  <span className="text-[10px] text-zinc-500">➔</span>
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.previewHighlightColor }}
                  />
                  <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                    {preset.style.fontFamily} ({preset.style.fontSize}px)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
