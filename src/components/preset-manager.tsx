'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Bookmark,
  Lock,
  Layers,
  Crown,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useAppStore, CaptionStyle } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { SUBTITLE_PRESETS } from '@/lib/presets';
import { fetchCloudPresets, saveCloudPreset, deleteCloudPreset } from '@/lib/cloud-presets';
import { PresetShowcaseModal } from './preset-showcase-modal';

export function PresetManager() {
  const setStyle = useAppStore((s) => s.setStyle);
  const activePresetId = useAppStore((s) => s.activePresetId);
  const setActivePresetId = useAppStore((s) => s.setActivePresetId);
  const customPresets = useAppStore((s) => s.customPresets);
  const saveCustomPresetLocal = useAppStore((s) => s.saveCustomPreset);
  const deleteCustomPresetLocal = useAppStore((s) => s.deleteCustomPreset);
  const setCustomPresets = useAppStore((s) => s.setCustomPresets);
  const style = useAppStore((s) => s.style);

  const { user, isPaid, isPro } = useAuth();

  const [presetNameInput, setPresetNameInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Determine Max Allowed Presets by Tier: Free = 0, 99 = 5, 299 = 20
  const maxPresets = isPro ? 20 : isPaid ? 5 : 0;
  const isPresetFull = customPresets.length >= maxPresets;

  // Load cloud presets on login
  useEffect(() => {
    if (!user) return;
    fetchCloudPresets(user.id).then((cloudData) => {
      if (cloudData.length > 0) {
        setCustomPresets(
          cloudData.map((cp) => ({
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
    if (!presetNameInput.trim()) return;

    if (!isPaid) {
      showToast('🔒 ฟีเจอร์บันทึก Preset สงวนสิทธิ์สำหรับผู้ร่วมสนับสนุน 99฿ ขึ้นไปค่ะ');
      return;
    }

    if (isPresetFull) {
      showToast(`โควต้าบันทึก Preset ของคุณเต็มแล้ว (${customPresets.length}/${maxPresets})`);
      return;
    }

    setIsSaving(true);
    const name = presetNameInput.trim();

    try {
      if (user) {
        // Save to Supabase Cloud
        const saved = await saveCloudPreset(user.id, name, style);
        if (saved) {
          setCustomPresets([
            { id: saved.id, name: saved.name, style: saved.style, createdAt: saved.created_at },
            ...customPresets,
          ]);
          setActivePresetId(saved.id);
        }
      } else {
        // Local fallback
        saveCustomPresetLocal(name);
      }

      showToast(`บันทึก Preset "${name}" เรียบร้อยแล้ว 🎉`);
      setPresetNameInput('');
    } catch (err) {
      console.error('Save preset error:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึก Preset');
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

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto p-4 sm:p-5 text-zinc-100 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800 max-w-full overflow-x-hidden">
      {/* Toast */}
      {toastMsg && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Save Current Style Card */}
      <form
        onSubmit={handleSaveCurrent}
        className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-3.5 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-zinc-700/70">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
            <span>บันทึกสไตล์ปัจจุบันเป็น Custom Preset:</span>
          </h4>

          <div className="flex items-center gap-2">
            {isPaid ? (
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                โควต้า {customPresets.length}/{maxPresets} แบบ
              </span>
            ) : (
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                สำหรับผู้สนับสนุน (99฿ / 299฿)
              </span>
            )}
          </div>
        </div>

        {isPaid ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
            <input
              type="text"
              placeholder="ตั้งชื่อสไตล์ของคุณ เช่น สไตล์ TikTok ประจำตัว..."
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              disabled={isPresetFull || isSaving}
              className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f0f18] border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 shadow-inner disabled:opacity-50"
              required
            />
            <button
              type="submit"
              disabled={isPresetFull || isSaving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isPresetFull ? 'โควต้าเต็มแล้ว' : '+ บันทึก Preset'}</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-[#0f0f18] border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-zinc-300">
              ร่วมสนับสนุน 99฿ เพื่อบันทึกได้ <strong>5 แบบ</strong> หรือ 299฿ เพื่อบันทึกได้ <strong>20 แบบ</strong> พร้อมซิงค์บน Cloud
            </p>
            <Link
              href="/credittopup"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold text-xs shrink-0 whitespace-nowrap shadow hover:scale-105 transition-transform"
            >
              เติมเครดิตเริ่มต้น 59฿
            </Link>
          </div>
        )}
      </form>

      {/* 2. User's Custom Presets Box */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-3.5 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-700/70">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-amber-500 group-focus-within/card:text-zinc-950 transition-all">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span>Preset กำหนดเองของคุณ ({customPresets.length}{isPaid ? `/${maxPresets}` : ''}):</span>
          </h4>

          {user && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5" />
              <span>ซิงค์กับ Google Account</span>
            </span>
          )}
        </div>

        {customPresets.length === 0 ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f0f18] border border-dashed border-zinc-700 text-center space-y-1.5">
            <p className="text-sm text-zinc-300 font-medium">ยังไม่มี Custom Preset ที่คุณบันทึกไว้</p>
            <p className="text-xs text-zinc-400">
              {isPaid
                ? 'ปรับแต่งฟอนต์และสีในแท็บ "สไตล์" แล้วพิมพ์ชื่อกดบันทึกด้านบนได้เลยค่ะ'
                : 'ร่วมสนับสนุนเริ่มต้น 99฿ เพื่อเริ่มสร้างและบันทึกสไตล์ส่วนตัวของคุณ'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {customPresets.map((cp) => {
              const isSelected = activePresetId === cp.id;

              return (
                <div
                  key={cp.id}
                  onClick={() => handleApplyPreset(cp.id, cp.style)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group w-full box-border ${
                    isSelected
                      ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                      : 'bg-[#0f0f18] border-zinc-700/80 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white truncate max-w-[150px]">
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
                          handleDeletePreset(cp.id, cp.name);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="ลบ Preset นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-700/70">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: cp.style.textColor }}
                    />
                    <span className="text-xs text-zinc-400">➔</span>
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: cp.style.highlightColor }}
                    />
                    <span className="text-xs text-zinc-300 font-mono ml-auto truncate">
                      {cp.style.fontFamily} ({cp.style.fontSize}px)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 1-Click System Presets List */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-3.5 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-700/70">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-amber-500 group-focus-within/card:text-zinc-950 transition-all">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>ธีมสำเร็จรูปของระบบ ({SUBTITLE_PRESETS.length} Presets):</span>
          </h4>
          <button
            type="button"
            onClick={() => setShowcaseOpen(true)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>ดูพรีวิว 10 แบบ</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUBTITLE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id, preset.style)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group relative w-full box-border ${
                  isSelected
                    ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                    : 'bg-[#0f0f18] border-zinc-700/80 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm text-white group-hover:text-orange-300 transition-colors">
                    {preset.name}
                  </span>

                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-snug">
                  {preset.description}
                </p>

                {/* Visual Swatch */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-800/60 w-full">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: preset.previewTextColor }}
                  />
                  <span className="text-xs text-zinc-400">➔</span>
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: preset.previewHighlightColor }}
                  />
                  <span className="text-xs text-zinc-300 font-mono ml-auto truncate">
                    {preset.style.fontFamily} ({preset.style.fontSize}px)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Showcase Gallery Modal */}
      <PresetShowcaseModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
        onSelectPreset={(p) => handleApplyPreset(p.id, p.style)}
      />
    </div>
  );
}
