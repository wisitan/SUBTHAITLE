'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Type,
  Upload,
  Check,
  Loader2,
  Crown,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
} from 'lucide-react';
import { THAI_SYSTEM_FONTS, FontOption, loadGoogleFont, loadCustomFontFile } from '@/lib/fonts';

interface Props {
  selectedFont: string;
  onSelectFont: (fontName: string) => void;
}

const MAX_CUSTOM_FONTS = 4;
const TOP_POPULAR_FONTS = ['Kanit', 'Prompt', 'Sarabun', 'Bai Jamjuree', 'Chakra Petch'];

export function FontPicker({ selectedFont, onSelectFont }: Props) {
  const [isOpen, setIsOpen] = useState(false);
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
    TOP_POPULAR_FONTS.forEach((f) => {
      loadGoogleFont(f);
    });
  }, []);

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customFonts.length >= MAX_CUSTOM_FONTS) {
      setUploadError(`คุณอัปโหลดฟอนต์ครบ ${MAX_CUSTOM_FONTS} ฟอนต์แล้วค่ะ (ลบฟอนต์เก่าออกก่อนเพิ่มใหม่ได้นะคะ)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
        previewText: 'สวัสดีครับ ฟอนต์ของฉัน',
      };

      setCustomFonts((prev) => [newCustomFont, ...prev.slice(0, MAX_CUSTOM_FONTS - 1)]);
      onSelectFont(fontName);
    } catch (err) {
      console.error('Custom font load error:', err);
      setUploadError('ไม่สามารถโหลดฟอนต์นี้ได้ กรุณาลองไฟล์อื่น');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteCustomFont = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomFonts((prev) => prev.filter((f) => f.id !== id));
    if (selectedFont === id) {
      onSelectFont('Kanit');
    }
  };

  const [fontSearch, setFontSearch] = useState('');
  const filteredSystemFonts = THAI_SYSTEM_FONTS.filter(
    (f) =>
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const filteredCustomFonts = customFonts.filter(
    (f) =>
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const isCustomFull = customFonts.length >= MAX_CUSTOM_FONTS;

  const currentFontOption =
    customFonts.find((f) => f.id === selectedFont) ||
    THAI_SYSTEM_FONTS.find((f) => f.id === selectedFont) || {
      id: selectedFont,
      name: selectedFont,
      previewText: 'สวัสดีครับ ซับไตเติลภาษาไทย',
      isPremium: false,
    };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[#181824] border border-zinc-700/90 shadow-xl space-y-3.5 transition-all duration-200 group/card hover:bg-[#20202e] hover:border-orange-500/60 focus-within:bg-[#20202e] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
      {/* 1. Header Bar: Title + Change Font Toggle + Upload Button */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-700/70">
        <label className="text-sm font-bold text-white flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-focus-within/card:scale-110 group-focus-within/card:bg-orange-500 group-focus-within/card:text-zinc-950 transition-all">
            <Type className="w-3.5 h-3.5" />
          </div>
          <span>เลือกฟอนต์ภาษาไทย (Thai Fonts):</span>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isCustomFull}
            className="px-2.5 py-1 rounded-xl bg-[#0e0e16] hover:bg-[#252536] border border-zinc-700 text-orange-400 hover:text-orange-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isCustomFull ? 'อัปโหลดครบ 4 ฟอนต์แล้ว' : 'อัปโหลดไฟล์ฟอนต์ภาษาไทย .ttf / .otf (สูงสุด 4 ฟอนต์)'}
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isCustomFull ? 'ฟอนต์ครบ' : '+ อัปโหลดฟอนต์'}</span>
            <span className="sm:hidden">+ ฟอนต์</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm ${
              isOpen
                ? 'bg-orange-500 text-zinc-950 font-bold border-transparent shadow-md'
                : 'bg-[#0e0e16] hover:bg-[#222232] border-zinc-700 text-zinc-200 hover:border-orange-500/50'
            }`}
          >
            <span>{isOpen ? 'ย่อเก็บ' : `ดูทั้งหมด (${THAI_SYSTEM_FONTS.length})`}</span>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
            )}
          </button>
        </div>

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

      {/* 2. Compact Active Font Capsule (Always Visible - No Scroll Trap!) */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0f0f18] border border-zinc-700/80 hover:border-orange-500/40 transition-all gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
            {selectedFont.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate">{selectedFont}</span>
              {currentFontOption?.isPremium && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  PRO
                </span>
              )}
              <span className="text-[11px] text-zinc-400 font-normal hidden sm:inline">• กำลังใช้งาน</span>
            </div>
            <p
              style={{ fontFamily: `"${selectedFont}", sans-serif` }}
              className="text-xs text-orange-300 truncate mt-0.5"
            >
              {currentFontOption.previewText || 'สวัสดีครับ ซับไตเติลภาษาไทย'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-400 font-medium">พร้อมใช้งาน</span>
        </div>
      </div>

      {/* 3. Quick Popular Font Chips (1-Click Fast Switch for Creators) */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>ฟอนต์ฮิต TikTok/Reels (คลิกเปลี่ยนทันที):</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {TOP_POPULAR_FONTS.map((fontName) => {
            const isSelected = selectedFont === fontName;
            return (
              <button
                key={fontName}
                type="button"
                onClick={() => {
                  loadGoogleFont(fontName);
                  onSelectFont(fontName);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold border-transparent shadow-md ring-1 ring-orange-400/50 scale-[1.02]'
                    : 'bg-[#0f0f18] text-zinc-200 border-zinc-700/80 hover:border-orange-400/60 hover:text-white hover:bg-[#222232]'
                }`}
              >
                <span style={{ fontFamily: `"${fontName}", sans-serif` }}>{fontName}</span>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Collapsible Catalog Drawer (Opens Only When Explicitly Requested) */}
      {isOpen && (
        <div className="pt-3 border-t border-zinc-700/70 space-y-3.5 animate-in fade-in-50 duration-200">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อฟอนต์ เช่น Kanit, Prompt, Mali..."
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0e0e16] border border-zinc-700 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Custom Uploaded Fonts Section */}
          {customFonts.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-orange-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>ฟอนต์ที่คุณอัปโหลด ({customFonts.length}/{MAX_CUSTOM_FONTS}):</span>
                </span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  ในเครื่องของคุณ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCustomFonts.map((font) => {
                  const isSelected = selectedFont === font.id;

                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => onSelectFont(font.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                          : 'bg-[#0f0f18] border-orange-500/40 text-zinc-200 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold truncate max-w-[130px] text-orange-300">
                            {font.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                          <div
                            onClick={(e) => handleDeleteCustomFont(font.id, e)}
                            className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                            title="ลบฟอนต์นี้"
                          >
                            <Trash2 className="w-3 h-3" />
                          </div>
                        </div>
                      </div>

                      <div
                        style={{ fontFamily: `"${font.id}", sans-serif` }}
                        className="text-sm font-semibold text-zinc-100 truncate tracking-wide"
                      >
                        {font.previewText || 'สวัสดีครับ ฟอนต์ของฉัน'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Fonts Section */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-zinc-400" />
                <span>รายชื่อฟอนต์ทั้งหมด ({filteredSystemFonts.length}):</span>
              </span>
              <span className="text-[11px] text-zinc-500">คลิกเพื่อเลือก</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {filteredSystemFonts.map((font) => {
                const isSelected = selectedFont === font.id;

                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      loadGoogleFont(font.id);
                      onSelectFont(font.id);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                        : 'bg-[#0f0f18] border-zinc-700/80 text-zinc-200 hover:border-orange-400 hover:bg-[#28283a] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold truncate max-w-[130px] text-zinc-200">
                          {font.name}
                        </span>
                        {font.isPremium && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            PRO
                          </span>
                        )}
                      </div>
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

          {/* Collapse Footer Button */}
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-[#0f0f18] hover:bg-[#222232] text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700 shadow-sm"
            >
              <ChevronUp className="w-3.5 h-3.5 text-orange-400" />
              <span>ซ่อนรายชื่อฟอนต์ (ย่อเก็บ)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

