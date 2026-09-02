'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  FileVideo,
  FileAudio,
  Film,
  Check,
  Cloud,
  Loader2,
  Upload,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { getVideoFromCache, saveVideoToCache } from '@/lib/video-cache';
import { saveProjectToCloud, uploadProxyToR2 } from '@/lib/projects-client';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';
import { VideoPlayer } from '@/components/video-player';
import { CaptionTable } from '@/components/caption-table';
import { StyleEditor } from '@/components/style-editor';
import { PresetManager } from '@/components/preset-manager';
import { ExportMenu } from '@/components/export-menu';
import { UserProfileButton } from '@/components/user-profile-button';
import { Tooltip } from '@/components/ui/tooltip';

export default function EditorPage() {
  const { user } = useAuth();

  const file = useAppStore((s) => s.file);
  const setFile = useAppStore((s) => s.setFile);
  const videoUrl = useAppStore((s) => s.videoUrl);
  const setVideoUrl = useAppStore((s) => s.setVideoUrl);
  const captions = useAppStore((s) => s.captions);
  const rawWords = useAppStore((s) => s.rawWords);
  const style = useAppStore((s) => s.style);
  const aspectRatio = useAppStore((s) => s.aspectRatio);
  const activeCaptionIndex = useAppStore((s) => s.activeCaptionIndex);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProjectId = useAppStore((s) => s.setCurrentProjectId);
  const projectTitle = useAppStore((s) => s.projectTitle);
  const setProjectTitle = useAppStore((s) => s.setProjectTitle);

  const [activeTab, setActiveTab] = useState<'captions' | 'style' | 'presets'>('captions');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Debounced Auto-Save to Supabase
  useEffect(() => {
    if (!user || captions.length === 0) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const storeState = useAppStore.getState();
        const savedProject = await saveProjectToCloud({
          id: currentProjectId || undefined,
          userId: user.id,
          title: projectTitle || file?.name || 'SUBTHAITLE Project',
          duration: mediaDuration,
          proxyUrl: storeState.proxyUrl || undefined,
          originalFilename: storeState.originalFilename || file?.name || undefined,
          captions,
          rawWords,
          style,
          aspectRatio,
          file,
        });

        if (savedProject?.id) {
          if (!currentProjectId) {
            setCurrentProjectId(savedProject.id);
          }
          if (savedProject.proxy_url && !storeState.proxyUrl) {
            useAppStore.getState().setProxyUrl(savedProject.proxy_url);
          }
          setSaveStatus('saved');
        } else {
          setSaveStatus('idle');
        }
      } catch (err) {
        console.warn('Auto-save error:', err);
        setSaveStatus('idle');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, captions, style, aspectRatio, currentProjectId, projectTitle, file, mediaDuration, rawWords, setCurrentProjectId]);

  // Auto-restore cached video from browser IndexedDB if videoUrl is missing
  useEffect(() => {
    if (videoUrl) return;
    const lookupKey = currentProjectId || projectTitle || file?.name;
    if (!lookupKey) return;

    let isMounted = true;
    (async () => {
      try {
        const cachedBlob =
          (await getVideoFromCache(lookupKey)) ||
          (currentProjectId ? await getVideoFromCache(currentProjectId) : null) ||
          (projectTitle ? await getVideoFromCache(projectTitle) : null);

        if (cachedBlob && isMounted && !useAppStore.getState().videoUrl) {
          const url = URL.createObjectURL(cachedBlob);
          setVideoUrl(url);
          setFile(cachedBlob as File);
        }
      } catch (err) {
        console.warn('[Editor] Auto-restore cached video error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentProjectId, projectTitle, file, videoUrl, setVideoUrl, setFile]);

  // Global Keyboard Shortcuts (Cmd+Z / Ctrl+Z for Undo, Cmd+Shift+Z / Ctrl+Y for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.getAttribute('type') !== 'range' &&
        target.getAttribute('type') !== 'checkbox';

      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        if (!isTextInput) {
          e.preventDefault();
          if (e.shiftKey) {
            useAppStore.getState().redo();
            showToast('ทำซ้ำ (Redo)');
          } else {
            useAppStore.getState().undo();
            showToast('ย้อนกลับ (Undo)');
          }
        }
      } else if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        if (!isTextInput) {
          e.preventDefault();
          useAppStore.getState().redo();
          showToast('ทำซ้ำ (Redo)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReconnectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVideoUrl(URL.createObjectURL(selectedFile));
      const key = currentProjectId || projectTitle || selectedFile.name;
      if (key) {
        saveVideoToCache(key, selectedFile);
      }
      if (currentProjectId) {
        saveVideoToCache(currentProjectId, selectedFile);
      }
      showToast('เชื่อมต่อไฟล์วิดีโอสำเร็จ!');

      // Upload proxy and generate thumbnail in background
      if (user && currentProjectId) {
        (async () => {
          try {
            let thumbnailUrl: string | null = null;
            try {
              const { blob, dataUrl } = await generateVideoThumbnail(selectedFile, 0.5);
              const uploadedThumb = await uploadProxyToR2(blob, 'thumb_' + currentProjectId, `${currentProjectId}_thumb.jpg`);
              thumbnailUrl = uploadedThumb || dataUrl;
            } catch (thumbErr) {
              console.warn('[Reconnect Thumbnail Error]:', thumbErr);
            }

            const proxyUrl = await uploadProxyToR2(selectedFile, currentProjectId, selectedFile.name);
            if (proxyUrl) {
              useAppStore.getState().setProxyUrl(proxyUrl);
            }

            saveProjectToCloud({
              id: currentProjectId,
              userId: user.id,
              title: projectTitle || selectedFile.name,
              thumbnailUrl,
              proxyUrl: proxyUrl || undefined,
              originalFilename: selectedFile.name,
              captions,
              rawWords,
              style,
              aspectRatio,
            });
          } catch (e) {
            console.warn('[Background Reconnect Sync Error]:', e);
          }
        })();
      }
    }
  };

  // If no active captions or media loaded, show friendly empty state
  if (!videoUrl && captions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-zinc-700 text-center space-y-4 shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white">ยังไม่มีโปรเจกต์ที่กำลังทำงาน</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            กรุณาอัปโหลดไฟล์วิดีโอหรือไฟล์เสียง และถอดเสียงภาษาไทยจากหน้าแรกก่อนเข้าสู่หน้าแก้ไขซับไตเติลค่ะ
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลักเพื่อเลือกไฟล์</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col selection:bg-orange-500/30">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={handleReconnectFile}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-sm">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Left: Back button & File info */}
          <div className="flex items-center gap-3 min-w-0">
            <Tooltip content="กลับสู่หน้าหลัก">
              <Link
                href="/"
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Tooltip>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                {file?.type.startsWith('audio/') ? (
                  <FileAudio className="w-5 h-5" />
                ) : (
                  <FileVideo className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Tooltip content="คลิกเพื่อพิมพ์เปลี่ยนชื่อโปรเจกต์">
                    <input
                      type="text"
                      value={projectTitle || file?.name || 'SUBTHAITLE Project'}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="text-sm sm:text-base font-bold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-orange-500 focus:outline-none transition-colors truncate max-w-[180px] sm:max-w-md py-0.5"
                    />
                  </Tooltip>

                  {/* Cloud Sync Indicator */}
                  {user && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-3 h-3 text-emerald-400" />
                          <span>บันทึกบนคลาวด์แล้ว</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span>ความยาว: {mediaDuration ? `${Math.round(mediaDuration)}s` : '--'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{captions.length} ท่อนซับ</span>
                  {!videoUrl && (
                    <>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>เลือกวิดีโอเพื่อพรีวิว</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Undo/Redo, Export Menu & User Profile */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo Toolbar */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl shadow-sm">
              <Tooltip content="ย้อนกลับการแก้ไข (Undo) • Cmd+Z / Ctrl+Z">
                <button
                  type="button"
                  onClick={() => {
                    useAppStore.getState().undo();
                    showToast('ย้อนกลับ (Undo)');
                  }}
                  className="p-1.5 sm:p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              </Tooltip>
              <div className="w-px h-4 bg-zinc-800" />
              <Tooltip content="ทำซ้ำการแก้ไข (Redo) • Cmd+Shift+Z / Ctrl+Y">
                <button
                  type="button"
                  onClick={() => {
                    useAppStore.getState().redo();
                    showToast('ทำซ้ำ (Redo)');
                  }}
                  className="p-1.5 sm:p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>

            <UserProfileButton />
            <ExportMenu onShowToast={showToast} />
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 py-3 sm:py-4 flex flex-col lg:flex-row gap-6 items-stretch lg:overflow-hidden">
        {/* Left Column: Interactive Video Player */}
        <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 flex flex-col lg:h-full lg:overflow-y-auto lg:scrollbar-none space-y-3 sm:space-y-4">
          <VideoPlayer />

          {/* Quick Jump to Active Subtitle Card (Mobile & Desktop Thumb Ergonomics) */}
          {captions.length > 0 && (
            <div className="p-3 sm:p-4 rounded-2xl bg-[#181824] border border-zinc-700/90 hover:border-orange-500/60 hover:bg-[#20202e] flex items-center justify-between gap-2.5 shadow-xl shrink-0 transition-all duration-200 group/jump">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0 font-mono font-bold text-xs group-hover/jump:scale-110 group-hover/jump:bg-orange-500 group-hover/jump:text-zinc-950 transition-all">
                  {activeCaptionIndex !== null && activeCaptionIndex !== -1 ? `#${activeCaptionIndex + 1}` : '📝'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    <span>
                      {activeCaptionIndex !== null && activeCaptionIndex !== -1
                        ? `ซับท่อนปัจจุบัน (#${activeCaptionIndex + 1})`
                        : 'เลือกท่อนซับในวิดีโอ'}
                    </span>
                  </p>
                  <p className="text-xs text-orange-300 truncate font-mono">
                    {activeCaptionIndex !== null && activeCaptionIndex !== -1 && captions[activeCaptionIndex]
                      ? `${captions[activeCaptionIndex].start.toFixed(2)}s: ${captions[activeCaptionIndex].text}`
                      : 'แตะปุ่มเพื่อเลื่อนไปกล่องแก้ไข'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('captions');
                  setTimeout(() => {
                    const targetIndex =
                      activeCaptionIndex !== null && activeCaptionIndex !== -1 ? activeCaptionIndex : 0;
                    const el = document.getElementById(`caption-card-${targetIndex}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-amber-400', 'bg-orange-500/20');
                      setTimeout(() => {
                        el.classList.remove('ring-2', 'ring-amber-400', 'bg-orange-500/20');
                      }, 1800);
                    }
                  }, 120);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>📝 แก้ไขท่อนนี้</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Studio Tabs & Independent Scrolling Tool Panel */}
        <div className="flex-1 min-w-0 w-full flex flex-col lg:h-full min-h-0 space-y-3 lg:overflow-hidden">
          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-3 p-1.5 bg-[#181824] border border-zinc-700/90 rounded-2xl shadow-xl gap-1 shrink-0">
            {/* Tab 1: Captions */}
            <button
              type="button"
              onClick={() => setActiveTab('captions')}
              className={`w-full min-w-0 py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-h-[52px] sm:min-h-[42px] text-center ${
                activeTab === 'captions'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              <span className="text-sm sm:text-base shrink-0">📝</span>
              <span className="truncate">
                ข้อความซับ {captions.length > 0 && <span className="font-mono text-[11px] sm:text-xs opacity-90">({captions.length})</span>}
              </span>
            </button>

            {/* Tab 2: Style */}
            <button
              type="button"
              onClick={() => setActiveTab('style')}
              className={`w-full min-w-0 py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-h-[52px] sm:min-h-[42px] text-center ${
                activeTab === 'style'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              <span className="text-sm sm:text-base shrink-0">🎨</span>
              <span className="truncate">ปรับแต่งฟอนต์</span>
            </button>

            {/* Tab 3: Presets */}
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`w-full min-w-0 py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-h-[52px] sm:min-h-[42px] text-center ${
                activeTab === 'presets'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-300 hover:text-white hover:bg-[#242434]'
              }`}
            >
              <span className="text-sm sm:text-base shrink-0">⚡</span>
              <span className="truncate">ธีมสำเร็จรูป</span>
            </button>
          </div>

          {/* Tab Content Panels (Scrolls independently inside this box on Desktop) */}
          <div className="flex-1 min-h-0 bg-[#0c0c14] rounded-3xl border border-zinc-700/90 lg:overflow-hidden shadow-2xl flex flex-col">
            {activeTab === 'captions' ? (
              <CaptionTable />
            ) : activeTab === 'style' ? (
              <StyleEditor />
            ) : (
              <PresetManager />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
