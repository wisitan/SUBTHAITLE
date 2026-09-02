'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Bookmark,
  Layers,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useAppStore, CaptionStyle } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { SUBTITLE_PRESETS } from '@/lib/presets';
import { fetchCloudPresets, saveCloudPreset, deleteCloudPreset } from '@/lib/cloud-presets';

export function PresetManager() {
  const setStyle = useAppStore((s) => s.setStyle);
  const activePresetId = useAppStore((s) => s.activePresetId);
  const setActivePresetId = useAppStore((s) => s.setActivePresetId);
  const customPresets = useAppStore((s) => s.customPresets);
  const saveCustomPresetLocal = useAppStore((s) => s.saveCustomPreset);
  const deleteCustomPresetLocal = useAppStore((s) => s.deleteCustomPreset);
  const setCustomPresets = useAppStore((s) => s.setCustomPresets);
  const style = useAppStore((s) => s.style);

  const { user } = useAuth();

  const [presetNameInput, setPresetNameInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Maximum allowed custom presets per account = 6
  const MAX_CUSTOM_PRESETS = 6;
  const isPresetFull = customPresets.length >= MAX_CUSTOM_PRESETS;

  // Load cloud presets on login
  useEffect(() => {
    if (!user) return;
    fetchCloudPresets(user.id).then((cloudData) => {
      if (cloudData.length > 0) {
        setCustomPresets(
          cloudData.slice(0, MAX_CUSTOM_PRESETS).map((cp) => ({
            id: cp.id,
            name: cp.name,
            style: cp.style,
            createdAt: cp.created_at,
          }))
        );
      }
    });
  }, [user, setCustomPresets]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = presetNameInput.trim();
    if (!name) return;

    if (isPresetFull) {
      showToast(`โควต้าบันทึก Preset ของคุณครบ ${MAX_CUSTOM_PRESETS} แบบแล้วค่ะ (ลบอันเก่าออกก่อนเพิ่มใหม่ได้นะคะ)`);
      return;
    }

    setIsSaving(true);

    try {
      if (user) {
        // Save to Supabase Cloud
        const saved = await saveCloudPreset(user.id, name, style);
        if (saved) {
          setCustomPresets([
            { id: saved.id, name: saved.name, style: saved.style, createdAt: saved.created_at },
            ...customPresets.slice(0, MAX_CUSTOM_PRESETS - 1),
          ]);
          setActivePresetId(saved.id);
        }
      } else {
        // Local fallback (Zustand store + LocalStorage)
        saveCustomPresetLocal(name);
      }

      showToast(`บันทึก Preset "${name}" เรียบร้อยแล้ว 🎉`);
      setPresetNameInput('');
    } catch (err) {
      console.error('Save preset error:', err);
      // Fallback local save if network fails
      saveCustomPresetLocal(name);
      showToast(`บันทึก Preset "${name}" ไว้ในเครื่องเรียบร้อยแล้ว`);
      setPresetNameInput('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (user) {
      await deleteCloudPreset(id);
    }
    deleteCustomPresetLocal(id);
    showToast(`ลบ Preset "${name}" แล้ว`);
  };

  const handleApplyPreset = (id: string, presetStyle: CaptionStyle) => {
    setStyle(presetStyle);
    setActivePresetId(id);
    showToast('ปรับใช้สไตล์ Preset เรียบร้อย');
  };

  /**
   * Helper to render the live visual preview container matching Image 5
   */
  const renderVisualPreviewBox = (cardStyle: CaptionStyle) => {
    const isSticker = cardStyle.wordAnimationMode === 'sticker';

    return (
      <div
        className={`w-full py-5 px-4 rounded-xl border border-zinc-800/80 flex items-center justify-center text-center overflow-hidden shadow-inner ${
          cardStyle.hasBackground
            ? 'bg-zinc-900'
            : 'bg-gradient-to-b from-[#161622] to-[#0a0a10]'
        }`}
      >
        <p
          className="inline-block px-3 py-1 rounded-lg transition-all select-none"
          style={{
            fontFamily: `"${cardStyle.fontFamily}", sans-serif`,
            fontSize: `${Math.min(28, Math.max(17, cardStyle.fontSize || 24))}px`,
            color: cardStyle.textColor || '#FFFFFF',
            fontWeight: cardStyle.fontWeight as React.CSSProperties['fontWeight'],
            letterSpacing: `${cardStyle.letterSpacing ?? 0}px`,
            lineHeight: cardStyle.lineHeight ?? 1.4,
            backgroundColor: cardStyle.hasBackground
              ? cardStyle.backgroundColor || '#000000'
              : 'transparent',
            textShadow: cardStyle.hasShadow
              ? `0 4px ${cardStyle.shadowBlur || 8}px ${cardStyle.shadowColor || '#000000'}`
              : 'none',
          }}
        >
          <span>สวัสดีครับ </span>
          <span
            className={isSticker ? 'inline-block px-1.5 py-0.5 rounded-md text-zinc-950 font-extrabold' : ''}
            style={{
              color: isSticker ? '#121216' : (cardStyle.highlightColor || '#FACC15'),
              backgroundColor: isSticker ? (cardStyle.highlightColor || '#FACC15') : 'transparent',
              fontWeight: 800,
            }}
          >
            SUBTHAITLE
          </span>
          <span> มาแล้ว!</span>
        </p>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto p-4 sm:p-5 text-zinc-100 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800 max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SECTION: User's Custom Presets (Max 6 Presets, Unlocked for Everyone)  */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        
        {/* Header with Save Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-700/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Preset กำหนดเองของคุณ</span>
                <span className="text-xs text-orange-400 font-semibold font-mono">
                  ({customPresets.length}/{MAX_CUSTOM_PRESETS})
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Cloud className="w-3.5 h-3.5" />
                <span>ซิงค์กับ Google Account</span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400 font-medium bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
                บันทึกบนอุปกรณ์นี้ (เข้าสู่ระบบเพื่อซิงค์คลาวด์)
              </span>
            )}
          </div>
        </div>

        {/* Save Current Style Input Form */}
        <form onSubmit={handleSaveCurrent} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="ตั้งชื่อ Preset เช่น สไตล์ช่อง TikTok ประจำตัว..."
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            disabled={isPresetFull || isSaving}
            className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f0f18] border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 shadow-inner disabled:opacity-50"
            required
          />
          <button
            type="submit"
            disabled={isPresetFull || isSaving || !presetNameInput.trim()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isPresetFull ? 'โควต้าเต็ม (6/6)' : '+ บันทึกสไตล์ปัจจุบัน'}</span>
          </button>
        </form>

        {/* Custom Presets Grid (Visual Cards) */}
        {customPresets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0f0f18] border border-dashed border-zinc-700 text-center space-y-1.5">
            <p className="text-sm text-zinc-300 font-bold">ยังไม่มี Custom Preset ที่คุณบันทึกไว้</p>
            <p className="text-xs text-zinc-400">
              ปรับแต่งฟอนต์ สี และเอฟเฟกต์ในแท็บ &quot;ปรับแต่งฟอนต์&quot; แล้วพิมพ์ชื่อกดบันทึกด้านบนได้เลยค่ะ (บันทึกได้ฟรีสูงสุด 6 แบบ)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {customPresets.map((cp) => {
              const isSelected = activePresetId === cp.id;

              return (
                <div
                  key={cp.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-orange-500 shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/50'
                      : 'bg-[#0f0f18] hover:bg-[#151522] border-zinc-700/80 hover:border-zinc-600 shadow-md'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Layers className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-bold text-sm text-white truncate max-w-[180px]">
                          {cp.name}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-zinc-950 text-[10px] font-black shrink-0">
                            ใช้งานอยู่
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePreset(cp.id, cp.name);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0"
                        title="ลบ Preset นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Live Visual Preview Box */}
                    {renderVisualPreviewBox(cp.style)}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] font-mono">
                        Font: {cp.style.fontFamily}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] font-mono">
                        Size: {cp.style.fontSize}px
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                          style={{ backgroundColor: cp.style.highlightColor }}
                        />
                        <span>Highlight</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(cp.id, cp.style)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                          : 'bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'กำลังใช้งาน' : 'เลือกใช้พรีเซ็ตนี้'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION: 10 Standard System Presets (Rich Visual Cards Matching Img 5) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-4 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-700/70">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-amber-500 group-focus-within/card:text-zinc-950 transition-all">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>ธีมสำเร็จรูปยอดนิยม ({SUBTITLE_PRESETS.length} Presets):</span>
          </h4>
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
            คลิกเลือกใช้สไตล์ที่ชอบได้ทันที
          </span>
        </div>

        {/* 10 Visual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SUBTITLE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;

            return (
              <div
                key={preset.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-orange-500 shadow-xl shadow-orange-500/10 ring-1 ring-orange-500/50'
                    : 'bg-[#0f0f18] hover:bg-[#151522] border-zinc-700/80 hover:border-zinc-600 shadow-md'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Card Header: Icon, Name, Badge, Description */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {preset.name}
                        </h5>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-zinc-950 text-[10px] font-black">
                            ใช้งานอยู่
                          </span>
                        )}
                      </div>

                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>พร้อมใช้</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  {/* Live Visual Preview Box */}
                  {renderVisualPreviewBox(preset.style)}

                  {/* Metadata tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] font-mono">
                      Font: {preset.style.fontFamily}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] font-mono">
                      Size: {preset.style.fontSize}px
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                        style={{ backgroundColor: preset.previewHighlightColor }}
                      />
                      <span>Highlight</span>
                    </span>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset.id, preset.style)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                        : 'bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'กำลังใช้งาน' : 'เลือกใช้พรีเซ็ตนี้'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

