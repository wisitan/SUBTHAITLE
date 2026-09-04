'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
}: TooltipProps) {
  if (!content) return <>{children}</>;

  const getPositionClass = () => {
    if (position === 'top') {
      if (align === 'right') return 'bottom-full right-0 mb-2';
      if (align === 'left') return 'bottom-full left-0 mb-2';
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
    if (position === 'bottom') {
      if (align === 'right') return 'top-full right-0 mt-2';
      if (align === 'left') return 'top-full left-0 mt-2';
      return 'top-full left-1/2 -translate-x-1/2 mt-2';
    }
    if (position === 'left') return 'right-full top-1/2 -translate-y-1/2 mr-2';
    return 'left-full top-1/2 -translate-y-1/2 ml-2';
  };

  return (
    <div className={`relative group/tooltip inline-flex items-center justify-center ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute ${getPositionClass()} z-50 pointer-events-none transition-all duration-150 ease-out opacity-0 invisible scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-hover/tooltip:scale-100`}
      >
        <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-100 bg-[#0f0f18]/95 border border-orange-500/70 rounded-lg shadow-2xl shadow-black/80 max-w-xs sm:max-w-sm whitespace-normal leading-snug text-left backdrop-blur-md ring-1 ring-orange-500/30">
          <span>{content}</span>
        </div>
      </div>
    </div>
  );
}
