'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  if (!content) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[position];

  return (
    <div className={`relative group/tooltip inline-flex items-center justify-center ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute ${positionClasses} z-50 pointer-events-none transition-all duration-150 ease-out opacity-0 invisible scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-hover/tooltip:scale-100`}
      >
        <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-100 bg-zinc-950/95 border border-orange-500/50 rounded-lg shadow-2xl shadow-orange-500/10 whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
          <span>{content}</span>
        </div>
      </div>
    </div>
  );
}
