'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Type,
  Upload,
  Check,
  Loader2,
} from 'lucide-react';
import { THAI_SYSTEM_FONTS, FontOption, loadGoogleFont, loadCustomFontFile } from '@/lib/fonts';

interface Props {
  selectedFont: string;
  onSelectFont: (fontName: string) => void;
}

export function FontPicker({ selectedFont, onSelectFont }: Props) {
  const [customFonts, setCustomFonts] = useState<FontOption[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload selected font
  useEffect(() => {
    loadGoogleFont(selectedFont);
  }, [selectedFont]);

  // Preload top fonts for preview
  useEffect(() => {
    THAI_SYSTEM_FONTS.slice(0, 5).forEach((f) => {
      loadGoogleFont(f.id);
    });
  }, []);

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.ttf', '.otf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError('กรุณาเลือกไฟล์ฟอนต์ .ttf หรือ .otf เท่านั้น (เนื่องจากข้อจำกัดการ Export วิดีโอ)');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const fontName = await loadCustomFontFile(file);
      const newCustomFont: FontOption = {
        id: fontName,
        name: `${file.name.replace(/\.[^/.]+$/, '')} (Custom)`,
        category: 'custom',
        previewText: 'ฟอนต์กำหนดเองของคุณ',
      };

      setCustomFonts((prev) => [newCustomFont, ...prev]);
      onSelectFont(fontName);
    } catch (err) {
      console.error('Custom font load error:', err);
      setUploadError('ไม่สามารถโหลดฟอนต์นี้ได้ กรุณาลองไฟล์อื่น');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const allFonts = [...customFonts, ...THAI_SYSTEM_FONTS];

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-3.5 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
      {/* Upload Custom Font Button */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-700/70">
        <label className="text-sm font-bold text-white flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
            <Type className="w-3.5 h-3.5" />
          </div>
          <span>เลือกฟอนต์ภาษาไทย (Thai Fonts):</span>
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1.5 rounded-xl bg-[#0e0e16] hover:bg-[#252536] border border-zinc-700 text-orange-400 hover:text-orange-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
          title="อัปโหลดไฟล์ฟอนต์ภาษาไทย .ttf / .otf"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>+ อัปโหลดฟอนต์</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf"
          onChange={handleCustomFontUpload}
          className="hidden"
        />
      </div>

      {uploadError && (
        <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
      )}

      {/* Font Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {allFonts.map((font) => {
          const isSelected = selectedFont === font.id;

          return (
            <button
              key={font.id}
              type="button"
              onClick={() => {
                loadGoogleFont(font.id);
                onSelectFont(font.id);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-[#0f0f18] border-zinc-700/80 text-zinc-200 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold truncate max-w-[140px] text-zinc-200">
                  {font.name}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Sample Preview Text in this Font */}
              <div
                style={{ fontFamily: `"${font.id}", sans-serif` }}
                className="text-base font-semibold text-zinc-100 truncate tracking-wide"
              >
                {font.previewText || 'สวัสดีครับ Thai Subtitle'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
