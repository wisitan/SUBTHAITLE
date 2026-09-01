'use client';

import React, { useRef, useState } from 'react';
import { CaptionItem } from '@/lib/store';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  captions: CaptionItem[];
  formatTime: (secs: number) => string;
  onSeek: (time: number) => void;
}

export function TimelineScrubber({
  currentTime,
  duration,
  captions,
  formatTime,
  onSeek,
}: TimelineScrubberProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onSeek(pos * duration);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
  };

  return (
    <div
      ref={progressBarRef}
      onClick={handleScrubberClick}
      onMouseMove={handleScrubberMouseMove}
      onMouseLeave={() => setHoverTime(null)}
      className="relative w-full h-3 bg-zinc-900 hover:h-4 transition-all cursor-pointer group/bar flex items-center select-none"
    >
      {/* Track background */}
      <div className="w-full h-1.5 bg-zinc-800 group-hover/bar:h-2 transition-all relative overflow-hidden">
        {/* Played Progress */}
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Subtitle Cue Markers on Timeline */}
      {duration > 0 &&
        captions.map((cue) => {
          const leftPct = (cue.start / duration) * 100;
          const widthPct = Math.max(0.5, ((cue.end - cue.start) / duration) * 100);
          return (
            <span
              key={cue.id}
              className="absolute top-0 bottom-0 bg-white/25 pointer-events-none rounded-sm"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={cue.text}
            />
          );
        })}

      {/* Hover Scrubbing Bubble */}
      {hoverTime !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-xs font-mono text-orange-400 pointer-events-none shadow-lg z-40"
          style={{
            left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`,
          }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
}
