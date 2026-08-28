'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Scissors,
  Link as LinkIcon,
  Play,
  Clock,
  AlertTriangle,
  Flame,
  AlignLeft,
  Film,
  Replace,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Props {
  onPlayCue?: (start: number) => void;
}

export function CaptionTable({ onPlayCue }: Props) {
  const captions = useAppStore((s) => s.captions);
  const activeIndex = useAppStore((s) => s.activeCaptionIndex);
  const pacingMode = useAppStore((s) => s.pacingMode);
  const customMaxWords = useAppStore((s) => s.customMaxWords);
  const setPacingMode = useAppStore((s) => s.setPacingMode);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
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
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-3.5 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-xs">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Pacing Selector Section */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-700 space-y-3.5">
        {/* Title, Counts, and Quick Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
              {captions.length}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                รายการซับไตเติล (Caption Editor)
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                autoScroll
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="เลื่อนหน้าจอตามวิดีโออัตโนมัติ"
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>

            {/* Time Shift Button */}
            <button
              type="button"
              onClick={() => setTimeShiftModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="ขยับเวลาซับทั้งหมดพร้อมกัน (+- Offset)"
            >
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>ขยับเวลา</span>
            </button>

            {/* Find & Replace Button */}
            <button
              type="button"
              onClick={() => setFindReplaceModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="ค้นหาและแทนที่คำในซับไตเติล"
            >
              <Replace className="w-3.5 h-3.5 text-amber-400" />
              <span>ค้นหา/แทนที่</span>
            </button>

            {/* Add new row */}
            <button
              type="button"
              onClick={() => addCaption()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มท่อน</span>
            </button>
          </div>
        </div>

        {/* 🎛️ Prominent Pacing Mode Selector (3 Big Cards + Manual Slider) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-zinc-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-orange-400" />
              ✂️ ปรับจังหวะความยาวท่อนซับ (Caption Pacing):
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
                  ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/80'
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
                  ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/80'
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
                  ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/80'
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
          <div className="pt-2 border-t border-zinc-900/90 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                <span>ความยาวคำกำหนดเอง (Manual Words Slider):</span>
                {pacingMode === 'custom' && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">
                    Custom Mode
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-orange-400 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800 text-sm">
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
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
      </div>

      {/* Scrollable Caption Cards Container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 max-w-full overflow-x-hidden"
      >
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
            const duration = Number((caption.end - caption.start).toFixed(2));

            return (
              <div
                key={caption.id}
                id={`caption-card-${actualIndex}`}
                ref={isActive ? activeCardRef : null}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 relative group/card max-w-full overflow-hidden ${
                  isActive
                    ? 'bg-zinc-900 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/40'
                    : 'bg-zinc-900 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/90'
                }`}
              >
                {/* Header Row: Index, Timings, Play Button, and Card Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 border-b border-zinc-800/60 text-sm">
                  {/* Left: Index + Play Button + Timings */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isActive
                          ? 'bg-orange-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {actualIndex + 1}
                    </span>

                    {/* Play this cue button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTime(caption.start);
                        if (onPlayCue) onPlayCue(caption.start);
                      }}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 transition-colors cursor-pointer shrink-0"
                      title="เล่นวิดีโอตั้งแต่ท่อนนี้"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Timestamp Editor Controls */}
                    <div className="flex items-center gap-1 font-mono text-xs">
                      {/* Start Time Input */}
                      <input
                        type="number"
                        step="0.1"
                        value={caption.start}
                        onChange={(e) => {
                          const newStart = parseFloat(e.target.value) || 0;
                          updateCaptionTiming(caption.id, newStart, caption.end);
                        }}
                        className="w-14 sm:w-16 px-1 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
                        title="เวลาเริ่ม (วินาที)"
                      />
                      <span className="text-zinc-500 text-[11px]">➔</span>
                      {/* End Time Input */}
                      <input
                        type="number"
                        step="0.1"
                        value={caption.end}
                        onChange={(e) => {
                          const newEnd = parseFloat(e.target.value) || 0;
                          updateCaptionTiming(caption.id, caption.start, newEnd);
                        }}
                        className="w-14 sm:w-16 px-1 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
                        title="เวลาจบ (วินาที)"
                      />
                      <span className="text-[11px] sm:text-xs text-zinc-400">
                        ({duration}s)
                      </span>
                    </div>

                    {/* Low Confidence AI Warning Flag */}
                    {caption.lowConfidence && (
                      <span
                        className="px-1.5 py-0.5 text-[10px] sm:text-xs rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1 font-medium shrink-0"
                        title="AI ไม่มั่นใจจุดนี้ กรุณาตรวจสอบความถูกต้อง"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        AI Low Conf
                      </span>
                    )}
                  </div>

                  {/* Right Actions: Split, Merge, Add, Delete */}
                  <div className="flex items-center gap-1 opacity-90 group-hover/card:opacity-100 transition-opacity ml-auto sm:ml-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => splitCaption(caption.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="แยกท่อนนี้ออกเป็น 2 ท่อน (Split)"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>

                    {actualIndex < captions.length - 1 && (
                      <button
                        type="button"
                        onClick={() => mergeCaption(caption.id, 'next')}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="รวมท่อนนี้กับท่อนถัดไป (Merge)"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => addCaption(caption.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="เพิ่มท่อนใหม่ต่อจากท่อนนี้"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCaption(caption.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="ลบท่อนนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Text Area Editor */}
                <div className="pt-2.5">
                  <textarea
                    rows={Math.max(1, Math.ceil(caption.text.length / 38))}
                    value={caption.text}
                    onChange={(e) => updateCaptionText(caption.id, e.target.value)}
                    className="w-full bg-transparent text-base text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans font-medium"
                    placeholder="พิมพ์ข้อความซับไตเติล..."
                  />
                </div>
              </div>
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
