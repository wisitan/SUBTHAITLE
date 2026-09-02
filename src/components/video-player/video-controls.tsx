'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  formatTime: (secs: number) => string;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function VideoControls({
  isPlaying,
  isMuted,
  isFullscreen,
  currentTime,
  duration,
  playbackRate,
  formatTime,
  onTogglePlay,
  onSeek,
  onRateChange,
  onToggleMute,
  onToggleFullscreen,
}: VideoControlsProps) {
  return (
    <div className="p-2.5 sm:p-3 bg-zinc-900 border-t border-zinc-700 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-sm text-zinc-300 select-none">
      {/* Left: Play/Pause, Rewind, Forward, Time */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-orange-500/20 shrink-0"
          title={isPlaying ? 'หยุดชั่วคราว (Spacebar)' : 'เล่น (Spacebar)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 ml-0.5 fill-zinc-950" />}
        </button>

        <button
          type="button"
          onClick={() => onSeek(currentTime - 5)}
          className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="ย้อนกลับ 5 วินาที (คีย์ลัด: ← หรือ J)"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSeek(currentTime + 5)}
          className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="ข้ามไปข้างหน้า 5 วินาที (คีย์ลัด: → หรือ L)"
        >
          <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Time Display */}
        <div className="font-mono text-xs sm:text-sm text-zinc-300 flex items-center gap-1 font-medium whitespace-nowrap">
          <span className="text-orange-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-zinc-500">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Speed selector, Volume, Fullscreen */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Speed Selector */}
        <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
          {[1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => onRateChange(rate)}
              title={`ปรับความเร็วการเล่น ${rate} เท่า`}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                playbackRate === rate
                  ? 'bg-zinc-800 text-orange-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Mute Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'เปิดเสียง (คีย์ลัด: M)' : 'ปิดเสียง (คีย์ลัด: M)'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title={isFullscreen ? 'ออกจากโหมดเต็มจอ (Esc)' : 'โหมดเต็มจอ (คีย์ลัด: F)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
