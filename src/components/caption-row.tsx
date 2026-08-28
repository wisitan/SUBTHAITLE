'use client';

import React, { memo } from 'react';
import {
  Play,
  AlertTriangle,
  Scissors,
  Link as LinkIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { CaptionItem } from '@/lib/store';

interface CaptionRowProps {
  caption: CaptionItem;
  actualIndex: number;
  isActive: boolean;
  isLast: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
  onPlayCue?: (start: number) => void;
  onTimingChange: (id: string, start: number, end: number) => void;
  onTextChange: (id: string, text: string) => void;
  onSplit: (id: string) => void;
  onMerge: (id: string, direction: 'next' | 'prev') => void;
  onAdd: (afterId?: string) => void;
  onDelete: (id: string) => void;
}

export const CaptionRow = memo(function CaptionRow({
  caption,
  actualIndex,
  isActive,
  isLast,
  cardRef,
  onPlayCue,
  onTimingChange,
  onTextChange,
  onSplit,
  onMerge,
  onAdd,
  onDelete,
}: CaptionRowProps) {
  const duration = Number((caption.end - caption.start).toFixed(2));

  return (
    <div
      id={`caption-card-${actualIndex}`}
      ref={cardRef}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 relative group/card max-w-full overflow-hidden ${
        isActive
          ? 'bg-[#24202e] border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/50'
          : 'bg-[#181824] border border-zinc-700/90 hover:border-orange-500/60 hover:bg-[#20202e] focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30 shadow-md'
      }`}
    >
      {/* Header Row: Index, Timings, Play Button, and Card Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 border-b border-zinc-700/70 text-sm">
        {/* Left: Index + Play Button + Timings */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
              isActive
                ? 'bg-orange-500 text-zinc-950'
                : 'bg-[#242434] text-zinc-300 border border-zinc-700'
            }`}
          >
            {actualIndex + 1}
          </span>

          {/* Play this cue button */}
          <button
            type="button"
            onClick={() => {
              if (onPlayCue) onPlayCue(caption.start);
            }}
            className="p-1.5 rounded-lg bg-[#242434] hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer shrink-0"
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
                onTimingChange(caption.id, newStart, caption.end);
              }}
              className="w-14 sm:w-16 px-1 py-0.5 rounded bg-[#0e0e16] border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
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
                onTimingChange(caption.id, caption.start, newEnd);
              }}
              className="w-14 sm:w-16 px-1 py-0.5 rounded bg-[#0e0e16] border border-zinc-700 text-orange-400 font-semibold text-center focus:outline-none focus:border-orange-500 text-xs"
              title="เวลาจบ (วินาที)"
            />
            <span className="text-[11px] sm:text-xs text-zinc-300 font-medium">
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
            onClick={() => onSplit(caption.id)}
            className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="แยกท่อนนี้ออกเป็น 2 ท่อน (Split)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={() => onMerge(caption.id, 'next')}
              className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="รวมท่อนนี้กับท่อนถัดไป (Merge)"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onAdd(caption.id)}
            className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="เพิ่มท่อนใหม่ต่อจากท่อนนี้"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(caption.id)}
            className="p-1.5 rounded-lg bg-[#242434] border border-zinc-700 hover:bg-rose-500/20 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
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
          onChange={(e) => onTextChange(caption.id, e.target.value)}
          className="w-full bg-transparent text-base text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans font-medium"
          placeholder="พิมพ์ข้อความซับไตเติล..."
        />
      </div>
    </div>
  );
});
