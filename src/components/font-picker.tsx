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

    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError('กรุณาเลือกไฟล์ฟอนต์ .ttf, .otf, หรือ .woff');
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
    <div className="space-y-3">
      {/* Upload Custom Font Button */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Type className="w-4 h-4 text-orange-400" />
          <span>เลือกฟอนต์ภาษาไทย (Thai Fonts):</span>
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-orange-400 hover:text-orange-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          title="อัปโหลดไฟล์ฟอนต์ภาษาไทย .ttf / .otf / .woff"
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          <span>+ อัปโหลดฟอนต์</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleCustomFontUpload}
          className="hidden"
        />
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-400 font-medium">{uploadError}</p>
      )}

      {/* Font Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
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
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold truncate max-w-[140px] text-zinc-200">
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
                className="text-sm font-semibold text-zinc-100 truncate tracking-wide"
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
