'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useAppStore, UserProject } from '@/lib/store';
import { getVideoFromCache } from '@/lib/video-cache';
import { fetchProjectsFromCloud, deleteProjectFromCloud, uploadProxyToR2 } from '@/lib/projects-client';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';
import {
  Clock,
  Cloud,
  FileVideo,
  Trash2,
  Play,
  Loader2,
  LogIn,
  Search,
  X,
  Calendar,
  Filter,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type TimeFilterType = 'all' | 'today' | '7days' | '30days' | 'custom';
type ViewMode = 'grid' | 'list';
type SortMode = 'updated_desc' | 'created_desc' | 'title_asc';

function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'เมื่อสักครู่';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

export function getProjectDisplayTitle(project: UserProject): string {
  if (project.title && project.title !== 'โปรเจกต์ไม่มีชื่อ' && project.title.trim() !== '') {
    return project.title;
  }
  if (project.original_filename && project.original_filename !== 'โปรเจกต์ไม่มีชื่อ' && project.original_filename.trim() !== '') {
    return project.original_filename;
  }
  if (project.proxy_url) {
    try {
      const parts = project.proxy_url.split('/');
      const filename = parts[parts.length - 1].replace(/^\d+_/, '');
      if (filename && !filename.includes('_thumb.jpg')) {
        return decodeURIComponent(filename);
      }
    } catch {}
  }
  if (Array.isArray(project.captions) && project.captions.length > 0 && (project.captions[0] as unknown as Record<string, unknown>)?.text) {
    const text = String((project.captions[0] as unknown as Record<string, unknown>).text).trim();
    if (text) {
      return text.length > 30 ? text.slice(0, 30) + '...' : text;
    }
  }
  return 'SUBTHAITLE Project';
}

function ProjectThumbnailImage({
  project,
  className = 'w-full h-full object-cover',
  iconSize = 'w-7 h-7',
}: {
  project: UserProject;
  className?: string;
  iconSize?: string;
}) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(project.thumbnail_url || null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (project.thumbnail_url) {
      setThumbSrc(project.thumbnail_url);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const cachedBlob =
          (await getVideoFromCache(project.id)) ||
          (await getVideoFromCache(project.title)) ||
          (project.original_filename ? await getVideoFromCache(project.original_filename) : null);

        const videoSource = cachedBlob || project.proxy_url;
        if (videoSource) {
          setIsGenerating(true);
          const { dataUrl, blob } = await generateVideoThumbnail(videoSource, 0.5);
          if (isMounted && dataUrl) {
            setThumbSrc(dataUrl);

            // In background, upload to R2 and save to project
            if (blob && project.user_id) {
              uploadProxyToR2(blob, 'thumb_' + project.id, `${project.id}_thumb.jpg`).then((uploadedUrl) => {
                const targetUrl = uploadedUrl || dataUrl;
                if (targetUrl) {
                  const resolvedTitle = getProjectDisplayTitle(project);
                  fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: project.id,
                      userId: project.user_id,
                      title: resolvedTitle,
                      originalFilename: project.original_filename || resolvedTitle,
                      thumbnailUrl: targetUrl,
                    }),
                  }).catch(() => {});
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Thumbnail Auto-Generate Error]:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [project]);

  if (thumbSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbSrc}
        alt={project.title}
        className={className}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-zinc-600 group-hover:text-orange-400 transition-colors">
      {isGenerating ? (
        <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
      ) : (
        <FileVideo className={iconSize} />
      )}
    </div>
  );
}

export function RecentProjects() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const loadProject = useAppStore((state) => state.loadProject);

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View, Sort & Pagination state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchProjectsFromCloud(user.id);
      setProjects(data);
    } catch (err) {
      console.warn('Could not fetch user projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Reset to page 1 whenever filters, search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, customStartDate, customEndDate, sortMode, viewMode]);

  const handleOpenProject = async (project: UserProject) => {
    const resolvedTitle = getProjectDisplayTitle(project);
    loadProject({
      ...project,
      title: resolvedTitle,
    });

    try {
      const cachedVideo =
        (await getVideoFromCache(project.id)) ||
        (await getVideoFromCache(resolvedTitle)) ||
        (project.original_filename ? await getVideoFromCache(project.original_filename) : null);
      if (cachedVideo) {
        const url = URL.createObjectURL(cachedVideo);
        useAppStore.getState().setVideoUrl(url);
        useAppStore.getState().setFile(cachedVideo as File);
      }
    } catch (err) {
      console.warn('[RecentProjects] Failed to load cached video:', err);
    }

    router.push('/editor');
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('คุณต้องการลบโปรเจกต์นี้ออกจากประวัติงานใช่หรือไม่?')) return;

    setDeletingId(id);
    try {
      const ok = await deleteProjectFromCloud(id, user.id);
      if (ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered projects based on search query and time range
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = project.title.toLowerCase().includes(q);
        const matchCaptions = project.captions?.some((c) => c.text.toLowerCase().includes(q));
        if (!matchTitle && !matchCaptions) return false;
      }

      // 2. Time Filter
      if (timeFilter === 'all') return true;

      const dateStr = project.updated_at || project.created_at;
      if (!dateStr) return true;
      const projectDate = new Date(dateStr);
      const now = new Date();

      if (timeFilter === 'today') {
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000);
        return projectDate >= fortyEightHoursAgo;
      }

      if (timeFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
        return projectDate >= sevenDaysAgo;
      }

      if (timeFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);
        return projectDate >= thirtyDaysAgo;
      }

      if (timeFilter === 'custom') {
        if (customStartDate && new Date(customStartDate) > projectDate) return false;
        if (customEndDate) {
          const endOfDay = new Date(customEndDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (endOfDay < projectDate) return false;
        }
        return true;
      }

      return true;
    });
  }, [projects, searchQuery, timeFilter, customStartDate, customEndDate]);

  // Sorted projects
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    list.sort((a, b) => {
      if (sortMode === 'updated_desc') {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      }
      if (sortMode === 'created_desc') {
        const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
        return dateB - dateA;
      }
      if (sortMode === 'title_asc') {
        return a.title.localeCompare(b.title, 'th');
      }
      return 0;
    });
    return list;
  }, [filteredProjects, sortMode]);

  // Pagination metrics (8 per page for both card and list view)
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const pagedProjects = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedProjects.slice(startIndex, startIndex + pageSize);
  }, [sortedProjects, validCurrentPage, pageSize]);

  // If user is not logged in, render an inviting banner
  if (!user) {
    return (
      <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>งานล่าสุด (Recent Projects)</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              เข้าสู่ระบบด้วย Google เพื่อบันทึกประวัติงานซับไตเติลบนคลาวด์อัตโนมัติ เปิดแก้ไขได้ตลอดไป
            </p>
          </div>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors border border-zinc-700 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 text-orange-400" />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="space-y-0.5">
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <span>งานล่าสุด (Recent Projects)</span>
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>บันทึกบนคลาวด์อัตโนมัติ (เก็บงาน 7 วัน • เครื่องเดิมเปิดดูได้ตลอด • 0 เครดิต)</span>
          </p>
        </div>

        {projects.length > 0 && (
          <span className="text-xs text-zinc-400 self-start sm:self-auto font-medium bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
            แสดง {filteredProjects.length} จาก {projects.length} โปรเจกต์
          </span>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      {projects.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="🔍 ค้นหาโปรเจกต์ หรือคำในซับไตเติล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Switcher & Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sort Selector */}
              <div className="relative inline-flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="pl-8 pr-7 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700/80 hover:border-orange-500/60 text-xs text-zinc-200 font-medium cursor-pointer focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                >
                  <option value="updated_desc">🕒 แก้ไขล่าสุด</option>
                  <option value="created_desc">📅 สร้างล่าสุด</option>
                  <option value="title_asc">🔤 ชื่อ A-Z (ก-ฮ)</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-zinc-500 text-[10px]">▼</div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="มุมมองการ์ด (Card View)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="มุมมองรายการ (List View)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Time Filter Toggles */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    timeFilter === 'all'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    timeFilter === 'today'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  วันนี้/เมื่อวาน
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('7days')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    timeFilter === '7days'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  7 วัน
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('30days')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    timeFilter === '30days'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  1 เดือน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter('custom');
                    if (!customStartDate) setCustomStartDate(getTodayDateString());
                    if (!customEndDate) setCustomEndDate(getTodayDateString());
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    timeFilter === 'custom'
                      ? 'bg-orange-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>กำหนดเอง</span>
                </button>
              </div>
            </div>

            {/* Sub-counter status */}
            <span className="text-[11.5px] text-zinc-400 font-medium">
              พบ {filteredProjects.length} โปรเจกต์
            </span>
          </div>

          {/* Custom Date Range Picker */}
          {timeFilter === 'custom' && (
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2.5 text-xs animate-in fade-in">
              <span className="text-zinc-400 font-medium">ช่วงวันที่:</span>

              {/* Start Date */}
              <div className="relative inline-flex items-center group/date">
                <input
                  type="date"
                  value={customStartDate}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onKeyDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.showPicker?.();
                  }}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 pr-8 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-orange-500/60 focus:border-orange-500 text-zinc-100 text-xs font-medium cursor-pointer [color-scheme:dark] shadow-inner transition-colors"
                />
                <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none group-hover/date:text-orange-400 transition-colors" />
              </div>

              <span className="text-zinc-500">ถึง</span>

              {/* End Date */}
              <div className="relative inline-flex items-center group/date">
                <input
                  type="date"
                  value={customEndDate}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onKeyDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.showPicker?.();
                  }}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 pr-8 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-orange-500/60 focus:border-orange-500 text-zinc-100 text-xs font-medium cursor-pointer [color-scheme:dark] shadow-inner transition-colors"
                />
                <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none group-hover/date:text-orange-400 transition-colors" />
              </div>

              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  ล้างวันที่
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span>กำลังโหลดรายการงานล่าสุด...</span>
        </div>
      )}

      {/* Initial Empty State (No Projects Saved) */}
      {!isLoading && projects.length === 0 && (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-500 mx-auto">
            <FileVideo className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-zinc-200">ยังไม่มีงานล่าสุด</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            เมื่อคุณอัปโหลดวิดีโอและถอดเสียงเสร็จสิ้น โปรเจกต์จะถูกบันทึกไว้ที่นี่อัตโนมัติ เพื่อให้คุณกลับมาแก้ไขหรือส่งออกใหม่ได้ตลอดเวลา
          </p>
        </div>
      )}

      {/* Filtered Empty State (No results match search/filter) */}
      {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">ไม่พบโปรเจกต์ที่ตรงกับคำค้นหาหรือตัวกรอง</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองเวลาเป็น &ldquo;ทั้งหมด&rdquo; ดูนะคะ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTimeFilter('all');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

      {/* Projects Display: Card Grid View (Clean Canva/Tamsub Style) */}
      {!isLoading && pagedProjects.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {pagedProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleOpenProject(project)}
              className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-orange-500/70 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.18)] hover:scale-[1.01] flex flex-col justify-between"
            >
              {/* Full-width Top Thumbnail Container */}
              <div className="relative w-full aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                <ProjectThumbnailImage
                  project={project}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  iconSize="w-8 h-8"
                />

                {/* Status Badge (Top Left) */}
                <div className="absolute top-2 left-2 pointer-events-none">
                  {project.proxy_url ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>เสร็จแล้ว</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-700/80 text-zinc-300 text-[10px] font-medium shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span>ในเครื่อง</span>
                    </span>
                  )}
                </div>

                {/* Delete Button (Top Right) */}
                <button
                  type="button"
                  disabled={deletingId === project.id}
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                  title="ลบโปรเจกต์"
                >
                  {deletingId === project.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Play Overlay on Hover */}
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge (Bottom Right) */}
                {project.duration > 0 && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white shadow">
                    {formatDuration(project.duration)}
                  </span>
                )}
              </div>

              {/* Bottom Text Area: Project Title + Date Only */}
              <div className="p-3 space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate group-hover:text-orange-400 transition-colors" title={getProjectDisplayTitle(project)}>
                  {getProjectDisplayTitle(project)}
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium">
                  {formatRelativeTime(project.updated_at || project.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects Display: Compact Clean List View */}
      {!isLoading && pagedProjects.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {pagedProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleOpenProject(project)}
              className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/60 rounded-xl p-2.5 sm:p-3 transition-all duration-200 cursor-pointer shadow-md hover:shadow-orange-500/5 flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* Left: Thumbnail & Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Thumbnail */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-orange-500/40 transition-colors">
                  <ProjectThumbnailImage
                    project={project}
                    className="w-full h-full object-cover"
                    iconSize="w-5 h-5"
                  />

                  {project.duration > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 backdrop-blur-sm text-[8.5px] font-mono font-bold text-white shadow">
                      {formatDuration(project.duration)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate group-hover:text-orange-300 transition-colors" title={getProjectDisplayTitle(project)}>
                    {getProjectDisplayTitle(project)}
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    {formatRelativeTime(project.updated_at || project.created_at)}
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={deletingId === project.id}
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="ลบโปรเจกต์"
                >
                  {deletingId === project.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && sortedProjects.length > pageSize && (
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/80 text-xs">
          <span className="text-zinc-400">
            แสดง <span className="font-semibold text-zinc-200">{(validCurrentPage - 1) * pageSize + 1} - {Math.min(validCurrentPage * pageSize, sortedProjects.length)}</span> จาก <span className="font-semibold text-zinc-200">{sortedProjects.length}</span> โปรเจกต์
          </span>

          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">ก่อนหน้า</span>
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-zinc-600">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        validCurrentPage === page
                          ? 'bg-orange-500 text-zinc-950 shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="hidden sm:inline text-[11px]">ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

