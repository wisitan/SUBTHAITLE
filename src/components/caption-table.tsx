'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Clock,
  Flame,
  AlignLeft,
  Film,
  Replace,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CaptionRow } from './caption-row';

interface Props {
  onPlayCue?: (start: number) => void;
}

export function CaptionTable({ onPlayCue }: Props) {
  const captions = useAppStore((s) => s.captions);
  const activeIndex = useAppStore((s) => s.activeCaptionIndex);
  const pacingMode = useAppStore((s) => s.pacingMode);
  const customMaxWords = useAppStore((s) => s.customMaxWords);
  const setPacingMode = useAppStore((s) => s.setPacingMode);
  const setActiveCaptionIndex = useAppStore((s) => s.setActiveCaptionIndex);
  const requestSeek = useAppStore((s) => s.requestSeek);
  const updateCaptionText = useAppStore((s) => s.updateCaptionText);
  const updateCaptionTiming = useAppStore((s) => s.updateCaptionTiming);
  const addCaption = useAppStore((s) => s.addCaption);
  const deleteCaption = useAppStore((s) => s.deleteCaption);
  const splitCaption = useAppStore((s) => s.splitCaption);
  const mergeCaption = useAppStore((s) => s.mergeCaption);
  const shiftAllCaptions = useAppStore((s) => s.shiftAllCaptions);
  const findAndReplace = useAppStore((s) => s.findAndReplace);

  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(false);
  const [timeShiftModalOpen, setTimeShiftModalOpen] = useState(false);
  const [timeShiftAmount, setTimeShiftAmount] = useState<string>('0.2');
  const [findReplaceModalOpen, setFindReplaceModalOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Smoothly scroll active card into view inside the container ONLY (never scroll window/outer page)
  useEffect(() => {
    if (autoScroll && activeIndex !== null && activeIndex !== -1 && activeCardRef.current && containerRef.current) {
      const container = containerRef.current;
      const card = activeCardRef.current;
      const cardTop = card.offsetTop - container.offsetTop;
      const cardHeight = card.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (cardTop < containerScrollTop || cardTop + cardHeight > containerScrollTop + containerHeight) {
        container.scrollTo({
          top: Math.max(0, cardTop - 16),
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex, autoScroll]);

  // Pre-indexed filtered captions (O(N) instead of O(N^2))
  const filteredWithIndex = useMemo(() => {
    if (!searchQuery.trim()) {
      return captions.map((caption, actualIndex) => ({ caption, actualIndex }));
    }
    const q = searchQuery.toLowerCase();
    return captions
      .map((caption, actualIndex) => ({ caption, actualIndex }))
      .filter(({ caption }) => caption.text.toLowerCase().includes(q));
  }, [captions, searchQuery]);

  const totalWords = useMemo(() => {
    return captions.reduce(
      (acc, cue) => acc + (cue.words?.length || cue.text.split(/\s+/).filter(Boolean).length),
      0
    );
  }, [captions]);

  const handleTimeShift = (offset: number) => {
    shiftAllCaptions(offset);
    showToast(`ขยับเวลาซับทั้งหมด ${offset > 0 ? `+${offset}` : offset} วินาทีเรียบร้อย`);
    setTimeShiftModalOpen(false);
  };

  const handleFindReplaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findText) return;
    findAndReplace(findText, replaceText);
    showToast(`แทนที่คำว่า "${findText}" ➔ "${replaceText}" ในท่อนซับทั้งหมดเรียบร้อย`);
    setFindReplaceModalOpen(false);
    setFindText('');
    setReplaceText('');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-3.5 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-xs">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Slim Top Header Section */}
      <div className="shrink-0 px-4 py-3 bg-[#181824] border-b border-zinc-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
              {captions.length}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span>รายการซับไตเติล</span>
                <span className="text-xs font-normal text-zinc-300">
                  (~{totalWords} คำ)
                </span>
              </h3>
            </div>
          </div>

          {/* Quick Toolbar Tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                autoScroll
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300 ring-1 ring-orange-500/50'
                  : 'bg-[#0f0f18] border-zinc-700 text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
              title="เลื่อนหน้าจอตามวิดีโออัตโนมัติ"
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>

            {/* Time Shift Button */}
            <button
              type="button"
              onClick={() => setTimeShiftModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#0f0f18] hover:bg-[#242434] text-zinc-200 border border-zinc-700 hover:border-zinc-500 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="ขยับเวลาซับทั้งหมดพร้อมกัน (+- Offset)"
            >
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>ขยับเวลา</span>
            </button>

            {/* Find & Replace Button */}
            <button
              type="button"
              onClick={() => setFindReplaceModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#0f0f18] hover:bg-[#242434] text-zinc-200 border border-zinc-700 hover:border-zinc-500 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="ค้นหาและแทนที่คำในซับไตเติล"
            >
              <Replace className="w-3.5 h-3.5 text-amber-400" />
              <span>ค้นหา/แทนที่</span>
            </button>

            {/* Add new row */}
            <button
              type="button"
              onClick={() => addCaption()}
              className="px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มท่อน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Container: Pacing + Search + Subtitle Cards */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800 max-w-full overflow-x-hidden"
      >
        {/* 🎛️ Pacing Mode Selector Card (Scrolls with content) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181824] border border-zinc-700/90 hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30 space-y-3 shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-zinc-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-orange-400" />
              <span>✂️ ปรับจังหวะความยาวท่อนซับ (Caption Pacing):</span>
            </span>
            <span className="text-xs text-zinc-300 hidden sm:inline">
              คลิกหรือลากเพื่อจัดกลุ่มคำใหม่แบบ Realtime
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Option 1: Short */}
            <button
              type="button"
              onClick={() => setPacingMode('short')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                pacingMode === 'short'
                  ? 'bg-orange-500/20 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-[#0f0f18] border-zinc-700/80 text-zinc-300 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1 text-orange-300">
                  <Flame className="w-4 h-4 text-orange-400" />
                  สั้นกระชับ (3-5 คำ)
                </span>
                {pacingMode === 'short' && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-snug">
                เหมาะกับ TikTok, Reels, Shorts
              </p>
            </button>

            {/* Option 2: Medium */}
            <button
              type="button"
              onClick={() => setPacingMode('medium')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                pacingMode === 'medium'
                  ? 'bg-orange-500/20 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-[#0f0f18] border-zinc-700/80 text-zinc-300 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1 text-amber-300">
                  <AlignLeft className="w-4 h-4 text-amber-400" />
                  มาตรฐาน (6-9 คำ)
                </span>
                {pacingMode === 'medium' && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-snug">
                เหมาะกับคลิป Vlog ทั่วไป อ่านสบาย
              </p>
            </button>

            {/* Option 3: Long */}
            <button
              type="button"
              onClick={() => setPacingMode('long')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                pacingMode === 'long'
                  ? 'bg-orange-500/20 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-[#0f0f18] border-zinc-700/80 text-zinc-300 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1 text-emerald-300">
                  <Film className="w-4 h-4 text-emerald-400" />
                  ประโยคยาว (10-15 คำ)
                </span>
                {pacingMode === 'long' && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-snug">
                เหมาะกับ YouTube แนวนอน, สัมภาษณ์
              </p>
            </button>
          </div>

          {/* 🎚️ Manual Custom Words per Cue Slider Bar */}
          <div className="pt-2.5 border-t border-zinc-700/70 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                <span>ความยาวคำกำหนดเอง (Manual Words Slider):</span>
                {pacingMode === 'custom' && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">
                    Custom Mode
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-lg border border-orange-500/40 text-sm shadow-sm">
                {pacingMode === 'short'
                  ? '~4 คำ/ท่อน'
                  : pacingMode === 'medium'
                  ? '~8 คำ/ท่อน'
                  : pacingMode === 'long'
                  ? '~13 คำ/ท่อน'
                  : `${customMaxWords} คำ/ท่อน`}
              </span>
            </div>

            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={
                pacingMode === 'short'
                  ? 4
                  : pacingMode === 'medium'
                  ? 8
                  : pacingMode === 'long'
                  ? 13
                  : customMaxWords
              }
              aria-label="ปรับความยาวคำต่อท่อนซับไตเติล"
              onChange={(e) => {
                const words = parseInt(e.target.value, 10);
                setPacingMode('custom', words);
              }}
              className="w-full accent-orange-500 cursor-pointer"
            />

            <div className="flex justify-between text-xs text-zinc-400">
              <span>สั้นมาก (2 คำ)</span>
              <span>ปานกลาง (8-10 คำ)</span>
              <span>ยาวมาก (20 คำ)</span>
            </div>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาข้อความในซับไตเติล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#181824] border border-zinc-700/90 hover:border-zinc-500 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 shadow-md transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {filteredWithIndex.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm space-y-2">
            <p>ไม่พบรายการซับไตเติลที่ตรงกับคำค้นหา</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-orange-400 underline hover:text-orange-300 cursor-pointer"
              >
                ล้างคำค้นหา
              </button>
            )}
          </div>
        ) : (
          filteredWithIndex.map(({ caption, actualIndex }) => {
            const isActive = actualIndex === activeIndex;

            return (
              <CaptionRow
                key={caption.id}
                caption={caption}
                actualIndex={actualIndex}
                isActive={isActive}
                isLast={actualIndex === captions.length - 1}
                cardRef={isActive ? activeCardRef : null}
                onPlayCue={(start) => {
                  setActiveCaptionIndex(actualIndex);
                  requestSeek(start, true);
                  if (onPlayCue) onPlayCue(start);
                }}
                onSelectCue={(start) => {
                  setActiveCaptionIndex(actualIndex);
                  requestSeek(start, false);
                }}
                onTimingChange={(id, start, end) => updateCaptionTiming(id, start, end)}
                onTextChange={(id, text) => updateCaptionText(id, text)}
                onSplit={(id) => splitCaption(id)}
                onMerge={(id, dir) => mergeCaption(id, dir)}
                onAdd={(afterId) => addCaption(afterId)}
                onDelete={(id) => deleteCaption(id)}
              />
            );
          })
        )}
      </div>

      {/* Time Shift Modal */}
      {timeShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                ขยับเวลาซับทั้งหมด (Time Shift)
              </h4>
              <button
                onClick={() => setTimeShiftModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              ใช้กรณีที่ซับไตเติลทั้งคลิปมาเร็วหรือช้ากว่าเสียงพูดพร้อมกันทั้งหมด สามารถขยับทุกท่อนพร้อมกันได้ค่ะ
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTimeShift(-0.5)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm font-bold text-zinc-200 border border-zinc-800"
                >
                  -0.5s (เร็วขึ้น)
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShift(-0.2)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm font-bold text-zinc-200 border border-zinc-800"
                >
                  -0.2s
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTimeShift(0.2)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm font-bold text-zinc-200 border border-zinc-800"
                >
                  +0.2s
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShift(0.5)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm font-bold text-zinc-200 border border-zinc-800"
                >
                  +0.5s (ช้าลง)
                </button>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="จำนวนวินาที (เช่น 1.2)"
                  value={timeShiftAmount}
                  onChange={(e) => setTimeShiftAmount(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleTimeShift(parseFloat(timeShiftAmount) || 0)}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 text-sm font-bold shadow"
                >
                  ขยับเวลา
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Find & Replace Modal */}
      {findReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Replace className="w-4 h-4 text-amber-400" />
                ค้นหาและแทนที่คำ (Find & Replace)
              </h4>
              <button
                onClick={() => setFindReplaceModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFindReplaceSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-zinc-200 font-bold mb-1.5">
                  คำที่ต้องการค้นหา (Find):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ซัมซุง"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-200 font-bold mb-1.5">
                  แทนที่ด้วยคำว่า (Replace with):
                </label>
                <input
                  type="text"
                  placeholder="เช่น Samsung"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setFindReplaceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-sm font-bold shadow"
                >
                  แทนที่ทั้งหมด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
