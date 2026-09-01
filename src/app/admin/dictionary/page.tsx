'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  X,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Clock,
} from 'lucide-react';

import { useAppStore } from '@/lib/store';
import { DictionaryEntry, getMergedDictionary } from '@/lib/default-dictionary';
import {
  fetchCustomDictionaryFromCloud,
  insertDictionaryEntryToCloud,
  updateDictionaryEntryInCloud,
  deleteDictionaryEntryFromCloud,
  seedStarterWordsToCloud,
} from '@/lib/supabase';
import { AdminPinModal } from '@/components/admin-pin-modal';

interface FeedbackItem {
  id: string;
  original_phrase: string;
  corrected_phrase: string;
  context_before?: string;
  context_after?: string;
  vote_count: number;
  status: 'pending' | 'auto_learned' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface FeedbackStats {
  total: number;
  pending: number;
  auto_learned: number;
  approved: number;
  rejected: number;
}

export default function AdminDictionaryPage() {
  const router = useRouter();
  const { isAdmin, setIsAdmin, adminToken, customDictionary, setCustomDictionary } = useAppStore();

  const [activeTab, setActiveTab] = useState<'dictionary' | 'feedback'>('dictionary');
  const [isLoading, setIsLoading] = useState(true);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPinModal, setShowPinModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    total: 0,
    pending: 0,
    auto_learned: 0,
    approved: 0,
    rejected: 0,
  });
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all');
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [isFeedbackTableMissing, setIsFeedbackTableMissing] = useState(false);

  // Add/Edit Word Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null);
  const [formWrongWord, setFormWrongWord] = useState('');
  const [formCorrectWord, setFormCorrectWord] = useState('');
  const [formCategory, setFormCategory] = useState<DictionaryEntry['category']>('general');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchCustomDictionaryFromCloud();
      if (res.isTableMissing) {
        setIsTableMissing(true);
      } else if (res.error) {
        console.warn('Fetch error:', res.error);
      } else {
        setIsTableMissing(false);
        if (res.data) {
          setCustomDictionary(res.data);
        }
      }
    } catch (err) {
      console.warn('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setCustomDictionary]);

  const loadFeedbackData = useCallback(async () => {
    if (!adminToken && !isAdmin) return;
    setIsFeedbackLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const url = new URL('/api/admin/feedback', window.location.origin);
      if (feedbackStatusFilter !== 'all') url.searchParams.set('status', feedbackStatusFilter);
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

      const res = await fetch(url.toString(), { headers });
      const json = await res.json();

      if (res.ok) {
        if (json.isTableMissing) {
          setIsFeedbackTableMissing(true);
        } else {
          setIsFeedbackTableMissing(false);
          setFeedbackList(json.data || []);
          if (json.stats) setFeedbackStats(json.stats);
        }
      }
    } catch (err) {
      console.warn('Feedback fetch error:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [adminToken, isAdmin, feedbackStatusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'feedback' && isAdmin) {
      loadFeedbackData();
    }
  }, [activeTab, isAdmin, loadFeedbackData]);

  // Compute merged dictionary list
  const mergedList = useMemo(() => {
    return getMergedDictionary(customDictionary);
  }, [customDictionary]);

  // Filtered dictionary based on search and category
  const filteredList = useMemo(() => {
    return mergedList.filter((item) => {
      const matchQuery =
        !searchQuery.trim() ||
        item.wrong_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.correct_word.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      return matchQuery && matchCat;
    });
  }, [mergedList, searchQuery, selectedCategory]);

  const handleOpenAddModal = (entry?: DictionaryEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormWrongWord(entry.wrong_word);
      setFormCorrectWord(entry.correct_word);
      setFormCategory(entry.category || 'general');
    } else {
      setEditingEntry(null);
      setFormWrongWord('');
      setFormCorrectWord('');
      setFormCategory('general');
    }
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWrongWord.trim() || !formCorrectWord.trim()) {
      setFormError('กรุณากรอกทั้งคำที่เขียนผิดและคำที่ถูกต้อง');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingEntry && editingEntry.id) {
        // Update in cloud
        const res = await updateDictionaryEntryInCloud(
          editingEntry.id,
          {
            wrong_word: formWrongWord.trim(),
            correct_word: formCorrectWord.trim(),
            category: formCategory,
          },
          adminToken
        );

        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          const updated = customDictionary.map((item) =>
            item.id === editingEntry.id ? res.data! : item
          );
          setCustomDictionary(updated);
          setIsAddModalOpen(false);
          showToast(`อัปเดตคำว่า "${formCorrectWord}" สำเร็จ ✨`);
        }
      } else {
        // Add new in cloud
        const res = await insertDictionaryEntryToCloud(
          {
            wrong_word: formWrongWord.trim(),
            correct_word: formCorrectWord.trim(),
            category: formCategory,
          },
          adminToken
        );

        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          setCustomDictionary([res.data, ...customDictionary]);
          setIsAddModalOpen(false);
          showToast(`เพิ่มคำว่า "${formCorrectWord}" ลงในพจนานุกรมแล้ว ✨`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: DictionaryEntry) => {
    if (!confirm(`คุณต้องการลบคำว่า "${entry.wrong_word}" ใช่หรือไม่?`)) {
      return;
    }

    if (entry.id) {
      await deleteDictionaryEntryFromCloud(entry.id, adminToken);
    }

    const updated = customDictionary.filter(
      (item) => item.wrong_word.toLowerCase() !== entry.wrong_word.toLowerCase()
    );
    setCustomDictionary(updated);
    showToast(`ลบคำว่า "${entry.wrong_word}" เรียบร้อยแล้ว`);
  };

  const handleFeedbackAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, action }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(json.message || 'บันทึกการกระทำสำเร็จ');
        await loadFeedbackData();
        await loadData();
      } else {
        alert(json.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('คุณต้องการลบ Feedback รายการนี้ใช่หรือไม่?')) return;
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch(`/api/admin/feedback?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        showToast('ลบรายการเรียบร้อย');
        await loadFeedbackData();
      }
    } catch {
      alert('Network error');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('คุณต้องการบันทึกคำศัพท์เริ่มต้น 100+ คำขึ้นไปยัง Supabase Database ใช่หรือไม่?')) {
      return;
    }
    setIsLoading(true);
    const res = await seedStarterWordsToCloud(adminToken);
    if (res.error) {
      alert(`ไม่สามารถ Seed ข้อมูลได้: ${res.error}`);
    } else {
      showToast(`บันทึกคำศัพท์เริ่มต้น ${res.data} คำขึ้น Supabase สำเร็จแล้ว 🎉`);
      await loadData();
    }
    setIsLoading(false);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mergedList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `subthaitle_dictionary_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setCustomDictionary([...json, ...customDictionary]);
          showToast(`นำเข้าคำศัพท์สำเร็จ ${json.length} รายการ`);
        }
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  const sqlScript = `-- สร้างตารางเก็บคลังคำศัพท์สำหรับ SUBTHAITLE
create table if not exists public.custom_dictionary (
    id bigint generated by default as identity primary key,
    wrong_word text not null unique,
    correct_word text not null,
    category text default 'general',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- เปิดใช้งาน RLS (Row Level Security) เพื่อความปลอดภัย
alter table public.custom_dictionary enable row level security;

-- อนุญาตให้อ่านข้อมูลได้ทุกคน (Public Read)
create policy "Allow public read access"
on public.custom_dictionary for select
using (true);

-- ดูสคริปต์เต็มได้ใน docs/supabase-feedback-setup.sql`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // If user is not logged in as Admin, show access gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">พื้นที่เฉพาะผู้ดูแลระบบ (Admin Only)</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            หน้านี้สงวนสิทธิ์สำหรับแอดมินในการจัดการคลังคำศัพท์ภาษาไทยและระบบเรียนรู้คำศัพท์จากผู้ใช้ กรุณากรอกรหัส PIN เพื่อเข้าใช้งาน
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setShowPinModal(true)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              🔐 ปลดล็อกสิทธิ์ Admin ด้วยรหัส PIN
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>

        <AdminPinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => setShowPinModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-zinc-900 border border-amber-500/40 text-amber-300 font-semibold text-xs shadow-2xl shadow-amber-500/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="กลับสู่หน้าหลัก"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">Admin Vocabulary Center</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Admin PIN Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                จัดการคลังคำศัพท์เฉพาะทางและระบบ Auto-Learn Feedback Loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setIsAdmin(false);
                router.push('/');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ล็อกเอาท์ Admin</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📚 พจนานุกรมหลัก (Core Dictionary)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'dictionary' ? 'bg-zinc-950/30 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'}`}>
              {mergedList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>🗳️ ระบบเรียนรู้จากผู้ใช้ (Feedback & Auto-Learned)</span>
            {feedbackStats.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black animate-pulse">
                {feedbackStats.pending} รอตรวจ
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CORE DICTIONARY */}
        {activeTab === 'dictionary' && (
          <div className="space-y-6">
            {/* Database Status Alert */}
            {isTableMissing && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>ยังไม่ได้สร้างตาราง custom_dictionary ใน Supabase</span>
                </div>
                <p className="text-zinc-300">
                  ระบบกำลังใช้งานคำศัพท์แบบ In-Memory ชั่วคราว หากต้องการซิงค์คำศัพท์ข้ามอุปกรณ์ กรุณารัน SQL Script ใน Supabase SQL Editor:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={copySqlToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center gap-1.5 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'คัดลอกคำสั่ง SQL แล้ว!' : 'คัดลอกคำสั่ง SQL'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาคำผิด หรือคำที่ถูกต้อง..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">ทุกหมวดหมู่ ({mergedList.length})</option>
                  <option value="creator">คำศัพท์สาย Creator</option>
                  <option value="brands">ชื่อแบรนด์ & สินค้า</option>
                  <option value="tech">ศัพท์ไอที & สายชาร์จ</option>
                  <option value="auto_learned">⚡ Auto-Learned จากผู้ใช้</option>
                  <option value="general">คำทั่วไป</option>
                  <option value="slang">คำสแลง</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSeedDefaults}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  title="บันทึกคำศัพท์เริ่มต้น 100+ คำขึ้น Cloud"
                >
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seed ขึ้น Cloud</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  title="Export เป็นไฟล์ JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer ml-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มคำศัพท์ใหม่</span>
                </button>
              </div>
            </div>

            {/* Word List Table */}
            <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-800 text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">คำที่มักถอดเสียงผิด (Wrong)</th>
                      <th className="px-5 py-3.5">คำที่ถูกต้อง (Correct)</th>
                      <th className="px-5 py-3.5">หมวดหมู่</th>
                      <th className="px-5 py-3.5">ที่มา</th>
                      <th className="px-5 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                          ไม่พบคำศัพท์ที่ตรงกับการค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-rose-300 font-mono">
                            {entry.wrong_word}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-emerald-400 font-mono text-sm">
                            {entry.correct_word}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-semibold border border-zinc-700">
                              {entry.category || 'general'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {entry.id ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-semibold">
                                <Database className="w-3 h-3" /> Supabase
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-semibold">
                                Built-in
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleOpenAddModal(entry)}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER FEEDBACK & AUTO-LEARNED */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            {/* Feedback Database Status Alert */}
            {isFeedbackTableMissing && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>ยังไม่ได้สร้างตาราง correction_feedback ใน Supabase</span>
                </div>
                <p className="text-zinc-300">
                  กรุณารัน SQL Migration สคริปต์จากไฟล์ <code>docs/supabase-feedback-setup.sql</code> ใน Supabase SQL Editor เพื่อเปิดใช้งานระบบบันทึก Feedback และ Auto-Learn
                </p>
              </div>
            )}

            {/* Feedback Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <div className="text-zinc-400 text-xs flex items-center justify-between">
                  <span>Total Feedback</span>
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white">{feedbackStats.total}</div>
                <p className="text-[10px] text-zinc-500">คู่คำที่ผู้ใช้แก้ไขทั้งหมด</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 space-y-1">
                <div className="text-emerald-400 text-xs flex items-center justify-between">
                  <span>Auto-Learned</span>
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-300">{feedbackStats.auto_learned}</div>
                <p className="text-[10px] text-emerald-500/80">⚡ แก้ซ้ำ ≥ 2 ครั้ง (ใช้งานใน AI แล้ว)</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-amber-500/30 space-y-1">
                <div className="text-amber-400 text-xs flex items-center justify-between">
                  <span>Pending Review</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">{feedbackStats.pending}</div>
                <p className="text-[10px] text-amber-500/80">รอโหวตซ้ำ หรือ Admin กดยืนยัน</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-blue-500/30 space-y-1">
                <div className="text-blue-400 text-xs flex items-center justify-between">
                  <span>Approved</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-300">{feedbackStats.approved}</div>
                <p className="text-[10px] text-blue-500/80">Admin กดยืนยันด้วยตนเอง</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาข้อความ Feedback..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={feedbackStatusFilter}
                  onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">สถานะทั้งหมด</option>
                  <option value="pending">⏳ Pending (รอตรวจ)</option>
                  <option value="auto_learned">⚡ Auto-Learned (ระบบเรียนรู้อัตโนมัติ)</option>
                  <option value="approved">✅ Approved (อนุมัติแล้ว)</option>
                  <option value="rejected">🚫 Rejected (ปฏิเสธ)</option>
                </select>
              </div>

              <button
                onClick={loadFeedbackData}
                disabled={isFeedbackLoading}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFeedbackLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            {/* Feedback List */}
            {isFeedbackLoading ? (
              <div className="p-12 text-center text-zinc-500 text-xs">กำลังโหลดข้อมูล Feedback...</div>
            ) : feedbackList.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 text-zinc-500 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="font-semibold text-zinc-400">ยังไม่มีรายการ Feedback ที่ตรงกับเงื่อนไข</p>
                <p className="text-[11px]">เมื่อผู้ใช้แก้ไขคำซับไตเติลบน Editor และทำการ Export ข้อมูลคู่คำจะถูกส่งมาที่นี่อัตโนมัติ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedbackList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/40 transition-all space-y-3 shadow-lg"
                  >
                    {/* Header: Vote badge + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center gap-1 border border-orange-500/30">
                          <Flame className="w-3 h-3" />
                          <span>แก้ซ้ำ {item.vote_count} ครั้ง</span>
                        </span>
                        {item.vote_count >= 2 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                            ⚡ Auto-Learned Triggered
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'auto_learned'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'approved'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : item.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Word Pair Diff */}
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                      <div className="text-xs font-mono">
                        <span className="text-zinc-500">AI ดั้งเดิม: </span>
                        <span className="text-rose-400 line-through font-semibold">{item.original_phrase}</span>
                      </div>
                      <div className="text-xs font-mono">
                        <span className="text-zinc-500">User แก้เป็น: </span>
                        <span className="text-emerald-400 font-black text-sm">{item.corrected_phrase}</span>
                      </div>
                      {(item.context_before || item.context_after) && (
                        <div className="text-[11px] text-zinc-500 font-sans italic pt-1 border-t border-zinc-900">
                          บริบท: &ldquo;...{item.context_before} <span className="text-zinc-300 font-semibold">{item.corrected_phrase}</span> {item.context_after}...&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-500">
                        อัปเดต: {new Date(item.updated_at).toLocaleString('th-TH')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFeedbackAction(item.id, 'approve')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer border border-emerald-500/30 flex items-center gap-1"
                          title="อนุมัติเข้าสู่ Dictionary ทันที"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>อนุมัติ</span>
                        </button>
                        <button
                          onClick={() => handleFeedbackAction(item.id, 'reject')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer border border-rose-500/30 flex items-center gap-1"
                          title="ปฏิเสธคำนี้"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>ปฏิเสธ</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="ลบถาวร"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{editingEntry ? 'แก้ไขคำศัพท์' : 'เพิ่มคำศัพท์ใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  คำที่มักถอดเสียงผิด (Wrong Phrase / Phonetic sound-alike):
                </label>
                <input
                  type="text"
                  value={formWrongWord}
                  onChange={(e) => setFormWrongWord(e.target.value)}
                  placeholder="เช่น วิธีใช้สี, usb แอมป์, ชาชาติ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  คำที่ถูกต้อง (Correct Word / Subtitle Output):
                </label>
                <input
                  type="text"
                  value={formCorrectWord}
                  onChange={(e) => setFormCorrectWord(e.target.value)}
                  placeholder="เช่น Type-C, USB-A, ชาร์จ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono font-bold placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">หมวดหมู่:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as DictionaryEntry['category'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="creator">คำศัพท์สาย Creator</option>
                  <option value="brands">ชื่อแบรนด์ & สินค้า</option>
                  <option value="tech">ศัพท์ไอที & สายชาร์จ</option>
                  <option value="auto_learned">⚡ Auto-Learned จากผู้ใช้</option>
                  <option value="general">คำทั่วไป</option>
                  <option value="slang">คำสแลง</option>
                </select>
              </div>

              {formError && (
                <p className="text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                  {formError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกคำศัพท์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
