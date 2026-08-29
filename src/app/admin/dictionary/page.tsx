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

export default function AdminDictionaryPage() {
  const router = useRouter();
  const { isAdmin, setIsAdmin, adminToken, customDictionary, setCustomDictionary } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean | null>(null);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPinModal, setShowPinModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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
        setIsCloudConnected(false);
      } else if (res.error) {
        setIsCloudConnected(false);
      } else {
        setIsCloudConnected(true);
        setIsTableMissing(false);
        if (res.data) {
          setCustomDictionary(res.data);
        }
      }
    } catch (err) {
      console.warn('Fetch error:', err);
      setIsCloudConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [setCustomDictionary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            wrong_word: formWrongWord,
            correct_word: formCorrectWord,
            category: formCategory,
          },
          adminToken
        );

        if (res.error && !isTableMissing) {
          setFormError(`เกิดข้อผิดพลาด: ${res.error}`);
          setIsSaving(false);
          return;
        }

        // Update locally
        const updated = customDictionary.map((item) =>
          item.id === editingEntry.id
            ? { ...item, wrong_word: formWrongWord, correct_word: formCorrectWord, category: formCategory }
            : item
        );
        setCustomDictionary(updated);
        showToast(`แก้ไขคำว่า "${formCorrectWord}" เรียบร้อยแล้ว`);
      } else {
        // Insert new entry
        const res = await insertDictionaryEntryToCloud(
          {
            wrong_word: formWrongWord,
            correct_word: formCorrectWord,
            category: formCategory,
          },
          adminToken
        );

        const newEntry: DictionaryEntry = res.data || {
          id: Date.now(),
          wrong_word: formWrongWord.trim(),
          correct_word: formCorrectWord.trim(),
          category: formCategory,
          created_at: new Date().toISOString(),
        };

        setCustomDictionary([newEntry, ...customDictionary]);
        showToast(`เพิ่มคำว่า "${formWrongWord}" ➔ "${formCorrectWord}" เข้าคลังสำเร็จ`);
      }

      setIsAddModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'บันทึกล้มเหลว';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: DictionaryEntry) => {
    if (!confirm(`คุณต้องการลบคำว่า "${entry.wrong_word}" ➔ "${entry.correct_word}" ออกจากคลังใช่หรือไม่?`)) {
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

-- สิทธิ์แก้ไข/ลบข้อมูลสงวนไว้สำหรับ Server Service Role เท่านั้น
-- (ปลอดภัย 100% ไม่เปิดสิทธิ์เขียนผ่าน Public Anon Key)`;

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
            หน้านี้สงวนสิทธิ์สำหรับแอดมินในการจัดการคลังคำศัพท์ภาษาไทยส่วนกลาง กรุณากรอกรหัส PIN เพื่อเข้าใช้งาน
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="กลับหน้าหลัก"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  คลังคำศัพท์แก้คำผิดภาษาไทย (Admin Dictionary)
                  <span className="px-2.5 py-0.5 text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                    👑 ADMIN MODE
                  </span>
                </h1>
                <p className="text-xs text-zinc-300 mt-0.5">
                  คำศัพท์ที่เพิ่มที่นี่จะถูกส่งต่อไปแก้คำผิดให้ผู้ใช้ทุกคนแบบ Real-time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAdmin(false);
                router.push('/');
              }}
              className="px-3.5 py-2 text-sm text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all font-medium"
            >
              ออกจาก Admin
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มคำศัพท์ใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Supabase Status & Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300 font-medium">คำศัพท์ทั้งหมดในระบบ</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">{mergedList.length} <span className="text-sm font-normal text-zinc-400">คำ</span></h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300 font-medium">คำศัพท์บน Cloud (Supabase)</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{customDictionary.length} <span className="text-sm font-normal text-zinc-400">คำ</span></h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300 font-medium">สถานะการเชื่อมต่อ Cloud</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                {isCloudConnected ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase เชื่อมต่อสมบูรณ์
                  </span>
                ) : isTableMissing ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    รอรันคำสั่งสร้าง Table
                  </span>
                ) : (
                  <span className="text-zinc-300 flex items-center gap-1">
                    <Cloud className="w-4 h-4" />
                    โหมด Local (ออฟไลน์)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="รีเฟรชสถานะ"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Missing Table SQL Alert Banner */}
        {isTableMissing && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <h4 className="font-bold text-base text-amber-300">
                  ต้องรันคำสั่ง SQL สร้างตาราง `custom_dictionary` ใน Supabase
                </h4>
              </div>
              <button
                onClick={copySqlToClipboard}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3.5 py-1.5 rounded-xl shadow transition-all cursor-pointer text-xs"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'คัดลอกแล้ว!' : 'คัดลอก SQL Script'}</span>
              </button>
            </div>
            <p className="text-zinc-200 leading-relaxed">
              ไปที่เมนู <strong>SQL Editor</strong> ใน Supabase Dashboard 👉 วางคำสั่งด้านล่างแล้วกดปุ่ม <strong>Run</strong> เพื่อเปิดใช้งานระบบคลังคำศัพท์ส่วนกลางแบบ Real-time ค่ะ
            </p>
            <pre className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 overflow-x-auto font-mono">
              {sqlScript}
            </pre>
          </div>
        )}

        {/* Toolbar: Search, Filters, & Tools */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาคำผิด หรือคำที่ถูกต้อง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Actions: Seed, Import, Export */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSeedDefaults}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                title="บันทึกคำศัพท์เริ่มต้น 100+ คำขึ้น Cloud"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Seed 100+ คำขึ้น Cloud</span>
              </button>

              <label className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4 text-zinc-400" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>

              <button
                onClick={handleExportJson}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                title="ดาวน์โหลดคำศัพท์ทั้งหมดเป็น JSON"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800/60">
            {[
              { id: 'all', label: 'ทั้งหมด', count: mergedList.length },
              { id: 'creator', label: '🛍️ Creator & E-commerce', count: mergedList.filter((x) => x.category === 'creator').length },
              { id: 'tech', label: '🤖 Tech & IT', count: mergedList.filter((x) => x.category === 'tech').length },
              { id: 'brands', label: '🏷️ Brands', count: mergedList.filter((x) => x.category === 'brands').length },
              { id: 'general', label: '💬 ภาษาไทยทั่วไป', count: mergedList.filter((x) => x.category === 'general').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dictionary Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="bg-zinc-900/80 text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">คำที่ Whisper มักผิด</th>
                  <th className="py-3.5 px-4 w-8 text-center">➔</th>
                  <th className="py-3.5 px-4">คำที่ถูกต้อง (แทนที่)</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4">แหล่งข้อมูล</th>
                  <th className="py-3.5 px-4 text-right w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 text-sm">
                      ไม่พบคำศัพท์ที่ตรงกับการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredList.map((entry, idx) => {
                    const isCloud = Boolean(entry.id);
                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 text-zinc-400 text-xs font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-semibold text-rose-300">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            {entry.wrong_word}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-zinc-500 font-bold">➔</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-300">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            {entry.correct_word}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isCloud ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <Cloud className="w-3.5 h-3.5" /> Cloud
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                              <Database className="w-3.5 h-3.5" /> Built-in
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAddModal(entry)}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="แก้ไขคำนี้"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry)}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="ลบคำนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                {editingEntry ? 'แก้ไขคำศัพท์ใน Dictionary' : 'เพิ่มคำศัพท์ใหม่ลง Dictionary'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                  คำที่ Whisper มักสะกดผิด <span className="text-zinc-500 font-normal">(ใส่หลายคำคั่นด้วย , ได้)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตักก้า, ซัมสูง, บลูทูด"
                  value={formWrongWord}
                  onChange={(e) => setFormWrongWord(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                  คำที่ถูกต้องที่ต้องการแทนที่ (Correct Word)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตะกร้า, Samsung, Bluetooth"
                  value={formCorrectWord}
                  onChange={(e) => setFormCorrectWord(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                  หมวดหมู่ (Category)
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as DictionaryEntry['category'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="creator">🛍️ Creator & E-commerce</option>
                  <option value="tech">🤖 Tech & IT</option>
                  <option value="brands">🏷️ Brands / Brand Names</option>
                  <option value="general">💬 ภาษาไทยทั่วไป</option>
                  <option value="slang">🔥 สแลง / คำฮิต</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 text-sm font-bold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกเข้าคลังคำศัพท์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
