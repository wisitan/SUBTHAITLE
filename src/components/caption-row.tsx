'use client';

import React, { memo } from 'react';
import {
  Play,
  AlertTriangle,
  Scissors,
  Link as LinkIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { CaptionItem } from '@/lib/store';
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
  onSplit,
  onMerge,
  onMove,
  onAdd,
  onDelete,
}: CaptionRowProps) {
  const duration = Number((caption.end - caption.start).toFixed(2));

  return (
    <div
      id={`caption-card-${actualIndex}`}
      ref={cardRef}
      onClick={() => {
        if (onSelectCue) onSelectCue(caption.start, actualIndex);
      }}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 relative group/card max-w-full overflow-visible hover:z-20 cursor-pointer ${
        isActive
          ? 'z-10 bg-[#24202e] border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/50'
          : 'bg-[#181824] border border-zinc-700/90 hover:border-orange-500/60 hover:bg-[#20202e] focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30 shadow-md'
      }`}
    >
      {/* Header Row: Index, Timings, Play Button, and Card Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 border-b border-zinc-700/70 text-sm">
        {/* Left: Index + Play Button + Timings */}
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

        {/* Right Actions: Move Up, Move Down, Split, Merge, Add, Delete */}
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
