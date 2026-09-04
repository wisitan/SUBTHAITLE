'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Play,
  AlertTriangle,
  Scissors,
  Link as LinkIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  X,
} from 'lucide-react';
import { CaptionItem, CaptionOverrideStyle, useAppStore } from '@/lib/store';
import { Tooltip } from '@/components/ui/tooltip';

interface CaptionRowProps {
  caption: CaptionItem;
  actualIndex: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
  onPlayCue?: (start: number) => void;
  onSelectCue?: (start: number, index: number) => void;
  onTimingChange: (id: string, start: number, end: number) => void;
  onTextChange: (id: string, text: string) => void;
  onOverrideChange?: (id: string, override: CaptionOverrideStyle | null) => void;
  onSplit: (id: string) => void;
  onMerge: (id: string, direction: 'next' | 'prev') => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  onAdd: (afterId?: string) => void;
  onDelete: (id: string) => void;
}

export const CaptionRow = memo(function CaptionRow({
  caption,
  actualIndex,
  isActive,
  isFirst,
  isLast,
  cardRef,
  onPlayCue,
  onSelectCue,
  onTimingChange,
  onTextChange,
  onOverrideChange,
  onSplit,
  onMerge,
  onMove,
  onAdd,
  onDelete,
}: CaptionRowProps) {
  const duration = Number((caption.end - caption.start).toFixed(2));
  const globalStyle = useAppStore((s) => s.style);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [popoverOpen]);

  const hasOverride = Boolean(
    caption.overrideStyle &&
    (caption.overrideStyle.positionY !== undefined ||
     caption.overrideStyle.positionX !== undefined ||
     caption.overrideStyle.fontSize !== undefined)
  );

  const currentPosY = caption.overrideStyle?.positionY ?? globalStyle.positionY ?? 28;
  const currentPosX = caption.overrideStyle?.positionX ?? globalStyle.positionX ?? 50;
  const currentFontSize = caption.overrideStyle?.fontSize ?? globalStyle.fontSize ?? 24;

  const handleUpdateOverride = (partial: Partial<CaptionOverrideStyle>) => {
    if (!onOverrideChange) return;
    const current = caption.overrideStyle || {};
    const updated: CaptionOverrideStyle = {
      ...current,
      ...partial,
    };
    onOverrideChange(caption.id, updated);
  };

  const handleResetOverride = () => {
    if (!onOverrideChange) return;
    onOverrideChange(caption.id, null);
  };

  return (
    <div
      id={`caption-card-${actualIndex}`}
      ref={cardRef}
      onClick={() => {
        if (onSelectCue) onSelectCue(caption.start, actualIndex);
      }}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 relative group/card max-w-full overflow-visible cursor-pointer ${
        popoverOpen
          ? 'z-50 bg-[#24202e] border-orange-500 shadow-2xl shadow-orange-500/20 ring-2 ring-orange-500'
          : isActive
          ? 'z-10 bg-[#24202e] border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/50'
          : 'bg-[#181824] border border-zinc-700/90 hover:border-orange-500/60 hover:bg-[#20202e] hover:z-20 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30 shadow-md'
      }`}
    >
      {/* Header Row: Index, Timings, Play Button, and Card Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 border-b border-zinc-700/70 text-sm">
        {/* Left: Index + Play Button + Timings + Custom Override Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <Tooltip content={`ท่อนซับลำดับที่ #${actualIndex + 1}`} align="left">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                isActive
                  ? 'bg-orange-500 text-zinc-950'
                  : 'bg-[#242434] text-zinc-300 border border-zinc-700'
              }`}
            >
              {actualIndex + 1}
            </span>
          </Tooltip>

          {/* Play this cue button */}
          <Tooltip content="เล่นวิดีโอตั้งแต่ท่อนนี้" align="left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayCue) onPlayCue(caption.start);
                if (onSelectCue) onSelectCue(caption.start, actualIndex);
              }}
              className="p-1.5 rounded-lg bg-[#242434] hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </Tooltip>

          {/* Timestamp Editor Controls */}
          <div className="flex items-center gap-1 font-mono text-xs">
            {/* Start Time Input */}
            <Tooltip content="เวลาเริ่มพูด (วินาที) • ดับเบิ้ลคลิกแก้ไข">
              <input
                type="number"
                step="0.1"
                value={caption.start}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const newStart = parseFloat(e.target.value) || 0;
                  onTimingChange(caption.id, newStart, caption.end);
                }}
                className="w-14 sm:w-16 px-1 py-0.5 rounded bg-[#0e0e16] border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
              />
            </Tooltip>
            <span className="text-zinc-500 text-[11px]">➔</span>
            {/* End Time Input */}
            <Tooltip content="เวลาจบประโยค (วินาที) • ดับเบิ้ลคลิกแก้ไข">
              <input
                type="number"
                step="0.1"
                value={caption.end}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const newEnd = parseFloat(e.target.value) || 0;
                  onTimingChange(caption.id, caption.start, newEnd);
                }}
                className="w-14 sm:w-16 px-1 py-0.5 rounded bg-[#0e0e16] border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
              />
            </Tooltip>
            <span className="text-[11px] sm:text-xs text-zinc-300 font-medium">
              ({duration}s)
            </span>
          </div>

          {/* Custom Override Indicator Badge */}
          {hasOverride && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverOpen(true);
                if (onSelectCue) onSelectCue(caption.start, actualIndex);
              }}
              className="px-1.5 py-0.5 text-[10px] rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1 font-medium shrink-0 cursor-pointer transition-colors"
              title="ท่อนนี้มีการปรับตำแหน่งหรือขนาดเฉพาะตัว คลิกเพื่อแก้ไข"
            >
              <span>🎯</span>
              <span>ปรับเฉพาะตัว ({currentPosY}%, {currentFontSize}px)</span>
            </button>
          )}

          {/* Low Confidence AI Warning Flag */}
          {caption.lowConfidence && (
            <Tooltip content="AI ไม่มั่นใจจุดนี้ กรุณาตรวจสอบคำ">
              <span className="px-1.5 py-0.5 text-[10px] sm:text-xs rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1 font-medium shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                AI Low Conf
              </span>
            </Tooltip>
          )}
        </div>

        {/* Right Actions: Move Up, Move Down, Tune (Override), Split, Merge, Add, Delete */}
        <div className="flex items-center gap-1 opacity-90 group-hover/card:opacity-100 transition-opacity ml-auto sm:ml-0 shrink-0">
          {/* Move Up */}
          {!isFirst && onMove && (
            <Tooltip content="เลื่อนกล่องซับนี้ขึ้น (Move Up)">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(caption.id, 'up');
                }}
                className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* Move Down */}
          {!isLast && onMove && (
            <Tooltip content="เลื่อนกล่องซับนี้ลง (Move Down)">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(caption.id, 'down');
                }}
                className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* 🎯 Per-Cue Tune / Override Popover Trigger */}
          <div className="relative">
            <Tooltip content={hasOverride ? 'ท่อนนี้มีสไตล์เฉพาะ (คลิกเพื่อแก้ไข/คืนค่า)' : 'ปรับตำแหน่งหรือขนาดย่อ-ขยายเฉพาะท่อนนี้'}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverOpen(!popoverOpen);
                  if (onSelectCue) onSelectCue(caption.start, actualIndex);
                }}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  hasOverride || popoverOpen
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/40'
                    : 'bg-[#242434] border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              </button>
            </Tooltip>

            {/* Floating Mini Popover & Backdrop */}
            {popoverOpen && (
              <>
                {/* Full-screen backdrop to capture clicks anywhere outside and block hover to lower cards */}
                <div
                  className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[0.5px] cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopoverOpen(false);
                  }}
                />

                <div
                  ref={popoverRef}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 ${isLast ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 w-72 sm:w-80 bg-[#12121c] border border-zinc-700/90 rounded-2xl p-3.5 shadow-2xl space-y-3 text-zinc-100 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100`}
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🎯</span>
                        <span>ปรับเฉพาะท่อนที่ #{actualIndex + 1}</span>
                      </span>
                      {hasOverride && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverOpen(false);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="ปิดหน้าต่างปรับแต่ง"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                {/* Slider 1: Position Y */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">ตำแหน่งแนวตั้ง (ขึ้น - ลง):</span>
                    <span className="font-mono text-orange-400 font-bold bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30 text-[11px]">
                      {currentPosY}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={85}
                    step={1}
                    value={currentPosY}
                    onChange={(e) => handleUpdateOverride({ positionY: parseInt(e.target.value, 10) })}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                  />
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: 'Safe', val: 28 },
                      { label: 'ล่าง', val: 38 },
                      { label: 'กลาง', val: 50 },
                      { label: 'บน', val: 75 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateOverride({ positionY: p.val })}
                        className={`py-1 px-1 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                          currentPosY === p.val
                            ? 'bg-orange-500 text-zinc-950 font-bold border-transparent'
                            : 'bg-zinc-800/80 border-zinc-700/80 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {p.label} ({p.val}%)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider 2: Position X */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">ตำแหน่งแนวนอน (ซ้าย - ขวา):</span>
                    <span className="font-mono text-orange-400 font-bold bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30 text-[11px]">
                      {currentPosX}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={1}
                    value={currentPosX}
                    onChange={(e) => handleUpdateOverride({ positionX: parseInt(e.target.value, 10) })}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {[
                      { label: 'ชิดซ้าย', val: 20 },
                      { label: 'กึ่งกลาง', val: 50 },
                      { label: 'ชิดขวา', val: 80 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateOverride({ positionX: p.val })}
                        className={`py-1 px-1 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                          currentPosX === p.val
                            ? 'bg-orange-500 text-zinc-950 font-bold border-transparent'
                            : 'bg-zinc-800/80 border-zinc-700/80 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider 3: Font Size */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">ขนาดตัวอักษร (Font Size):</span>
                    <span className="font-mono text-orange-400 font-bold bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30 text-[11px]">
                      {currentFontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={48}
                    step={1}
                    value={currentFontSize}
                    onChange={(e) => handleUpdateOverride({ fontSize: parseInt(e.target.value, 10) })}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                  />
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: 'เล็ก', val: 16 },
                      { label: 'กลาง', val: 24 },
                      { label: 'ใหญ่', val: 32 },
                      { label: 'จัมโบ้', val: 40 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateOverride({ fontSize: p.val })}
                        className={`py-1 px-1 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                          currentFontSize === p.val
                            ? 'bg-orange-500 text-zinc-950 font-bold border-transparent'
                            : 'bg-zinc-800/80 border-zinc-700/80 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {p.val}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  {hasOverride ? (
                    <button
                      type="button"
                      onClick={handleResetOverride}
                      className="text-[11px] text-zinc-400 hover:text-orange-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>คืนค่าตามสไตล์หลัก</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400">ใช้สไตล์หลักอัตโนมัติ</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setPopoverOpen(false)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-400 text-zinc-950 transition-colors cursor-pointer ml-auto"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

          {/* Split */}
          <Tooltip content="ตัดแบ่งซับท่อนนี้ออกเป็น 2 ท่อน (Split)">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSplit(caption.id);
              }}
              className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          {/* Merge */}
          {!isLast && (
            <Tooltip content="รวมท่อนนี้เข้ากับท่อนถัดไป (Merge)" align="right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(caption.id, 'next');
                }}
                className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          {/* Add */}
          <Tooltip content="เพิ่มกล่องซับใหม่ต่อจากท่อนนี้ (Add)" align="right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(caption.id);
              }}
              className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          {/* Delete */}
          <Tooltip content="ลบกล่องซับนี้ (Delete • ย้อนกลับได้ด้วย Cmd+Z)" align="right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(caption.id);
              }}
              className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-rose-500/20 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Inline Text Area Editor */}
      <div className="pt-2.5">
        <textarea
          rows={Math.max(1, Math.ceil(caption.text.length / 38))}
          value={caption.text}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectCue) onSelectCue(caption.start, actualIndex);
          }}
          onFocus={() => {
            if (onSelectCue) onSelectCue(caption.start, actualIndex);
          }}
          onChange={(e) => onTextChange(caption.id, e.target.value)}
          className="w-full bg-transparent text-base text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans font-medium"
          placeholder="พิมพ์ข้อความซับไตเติล..."
        />
      </div>
    </div>
  );
});
