'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Check, Loader2, Plus, ArrowRight, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DictionaryEntry } from '@/lib/default-dictionary';
import { insertDictionaryEntryToCloud } from '@/lib/supabase';
import { AdminPinModal } from './admin-pin-modal';

interface Props {
  originalText?: string;
  currentText: string;
  onSaved?: (entry: DictionaryEntry) => void;
}

/**
 * Finds word-level differences between original and current text
 */
function extractWordDifferences(original: string, current: string): { wrong: string; correct: string }[] {
  if (!original || !current || original.trim() === current.trim()) {
    return [];
  }

  // Tokenize by space or Intl.Segmenter
  let origTokens: string[] = [];
  let currTokens: string[] = [];

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    origTokens = Array.from(segmenter.segment(original.trim()))
      .filter((s) => s.isWordLike)
      .map((s) => s.segment);
    currTokens = Array.from(segmenter.segment(current.trim()))
      .filter((s) => s.isWordLike)
      .map((s) => s.segment);
  } else {
    origTokens = original.trim().split(/\s+/).filter(Boolean);
    currTokens = current.trim().split(/\s+/).filter(Boolean);
  }

  const diffs: { wrong: string; correct: string }[] = [];

  // Simple sequential matching for 1-1 or phrase replacements
  if (origTokens.length === currTokens.length) {
    for (let i = 0; i < origTokens.length; i++) {
      if (origTokens[i] !== currTokens[i]) {
        diffs.push({ wrong: origTokens[i], correct: currTokens[i] });
      }
    }
  } else if (origTokens.length > 0 && currTokens.length > 0) {
    // If lengths differ, treat the entire unequal string or unmatched segments
    const wrongJoined = original.trim();
    const correctJoined = current.trim();
    if (wrongJoined.length < 30 && correctJoined.length < 30) {
      diffs.push({ wrong: wrongJoined, correct: correctJoined });
    }
  }

  return diffs;
}

export function DictionarySuggestionBadge({ originalText, currentText, onSaved }: Props) {
  const isAdmin = useAppStore((s) => s.isAdmin);
  const customDictionary = useAppStore((s) => s.customDictionary);
  const setCustomDictionary = useAppStore((s) => s.setCustomDictionary);

  const [isSaving, setIsSaving] = useState(false);
  const [savedPairs, setSavedPairs] = useState<Record<string, boolean>>({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [modalPair, setModalPair] = useState<{ wrong: string; correct: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DictionaryEntry['category']>('general');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const diffPairs = useMemo(() => {
    if (!originalText) return [];
    return extractWordDifferences(originalText, currentText).filter(
      (pair) =>
        pair.wrong.length > 0 &&
        pair.correct.length > 0 &&
        pair.wrong !== pair.correct &&
        !savedPairs[`${pair.wrong}__${pair.correct}`]
    );
  }, [originalText, currentText, savedPairs]);

  if (diffPairs.length === 0) return null;

  const handleTriggerSave = (pair: { wrong: string; correct: string }) => {
    if (!isAdmin) {
      setModalPair(pair);
      setShowPinModal(true);
      return;
    }
    setModalPair(pair);
  };

  const handleConfirmSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalPair) return;

    setIsSaving(true);
    const { wrong, correct } = modalPair;

    try {
      // 1. Insert into cloud Supabase
      const res = await insertDictionaryEntryToCloud({
        wrong_word: wrong,
        correct_word: correct,
        category: selectedCategory,
      });

      const newEntry: DictionaryEntry = res.data || {
        id: Date.now(),
        wrong_word: wrong,
        correct_word: correct,
        category: selectedCategory,
        created_at: new Date().toISOString(),
      };

      // 2. Update local custom dictionary state
      setCustomDictionary([newEntry, ...customDictionary]);

      // 3. Mark as saved
      setSavedPairs((prev) => ({ ...prev, [`${wrong}__${correct}`]: true }));
      setToastMsg(`บันทึกคำว่า "${wrong}" ➔ "${correct}" เข้าคลังแล้ว 🎉`);
      setTimeout(() => setToastMsg(null), 3000);

      if (onSaved) onSaved(newEntry);
      setModalPair(null);
    } catch (err) {
      console.error('Failed to save to dictionary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
      {toastMsg && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <Check className="w-3.5 h-3.5" /> {toastMsg}
        </span>
      )}

      {diffPairs.map((pair, idx) => {
        const key = `${pair.wrong}__${pair.correct}`;
        const isAlreadySaved = savedPairs[key];

        if (isAlreadySaved) return null;

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleTriggerSave(pair)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-sm group"
            title="คลิกเพื่อบันทึกคำนี้เข้า Dictionary ส่วนกลาง (ช่วยให้ AI ถอดคำนี้ถูกตลอดไป)"
          >
            <Sparkles className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>💡 บันทึกเข้า Dictionary:</span>
            <span className="line-through text-rose-300/80 font-normal">{pair.wrong}</span>
            <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
            <span className="text-emerald-300 font-bold underline underline-offset-2">{pair.correct}</span>
            <Plus className="w-3 h-3 text-amber-400 ml-0.5 opacity-80 group-hover:opacity-100" />
          </button>
        );
      })}

      {/* Confirmation Modal for adding to Dictionary */}
      {modalPair && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                บันทึกคู่คำศัพท์ใหม่เข้าคลัง (Cloud Dictionary)
              </h4>
              <button
                onClick={() => setModalPair(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">คำที่ AI ถอดผิด:</span>
                  <span className="text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    {modalPair.wrong}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">คำที่ถูกต้อง (แทนที่):</span>
                  <span className="text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {modalPair.correct}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  เลือกหมวดหมู่:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as DictionaryEntry['category'])}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="creator">🛍️ Creator & E-commerce</option>
                  <option value="tech">🤖 Tech & IT</option>
                  <option value="brands">🏷️ Brands / Brand Names</option>
                  <option value="general">💬 ภาษาไทยทั่วไป</option>
                  <option value="slang">🔥 สแลง / คำฮิต</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalPair(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConfirmSave()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ยืนยันบันทึกขึ้น Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setModalPair(null);
        }}
        onSuccess={() => {
          setShowPinModal(false);
        }}
      />
    </div>
  );
}
