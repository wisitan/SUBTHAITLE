'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useAppStore, UserProject } from '@/lib/store';
import { getVideoFromCache } from '@/lib/video-cache';
import {
  Clock,
  Cloud,
  FileVideo,
  Trash2,
  Play,
  ArrowRight,
  Loader2,
  CheckCircle2,
  LogIn,
} from 'lucide-react';

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

export function RecentProjects() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const loadProject = useAppStore((state) => state.loadProject);

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.warn('Could not fetch user projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenProject = async (project: UserProject) => {
    loadProject(project);

    try {
      const cachedVideo = (await getVideoFromCache(project.id)) || (await getVideoFromCache(project.title));
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
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

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
            <span>บันทึกบนคลาวด์อัตโนมัติ เปิดแก้ไขได้ตลอดเวลา ไม่คิดเครดิตเพิ่ม</span>
          </p>
        </div>

        {projects.length > 0 && (
          <span className="text-xs text-zinc-400 self-start sm:self-auto font-medium">
            มีทั้งหมด {projects.length} โปรเจกต์
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span>กำลังโหลดรายการงานล่าสุด...</span>
        </div>
      )}

      {/* Empty State */}
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

      {/* Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleOpenProject(project)}
              className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/60 rounded-2xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-orange-500/5 flex flex-col justify-between overflow-hidden"
            >
              {/* Top Row: Thumbnail + Info */}
              <div className="flex items-start gap-3">
                {/* Thumbnail Snapshot or Icon */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-orange-500/40 transition-colors">
                  {project.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-600 group-hover:text-orange-400 transition-colors">
                      <FileVideo className="w-7 h-7" />
                    </div>
                  )}

                  {/* Play Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {project.duration > 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[9.5px] font-mono font-bold text-white shadow">
                      {formatDuration(project.duration)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      เสร็จแล้ว
                    </span>

                    {/* Delete Button */}
                    <button
                      type="button"
                      disabled={deletingId === project.id}
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="ลบโปรเจกต์"
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Project Title */}
                  <h4 className="text-sm font-bold text-zinc-100 line-clamp-1 group-hover:text-orange-300 transition-colors">
                    {project.title}
                  </h4>

                  {/* Subtitle count */}
                  <p className="text-[11px] text-zinc-400">
                    {project.captions?.length || 0} ท่อนซับไตเติล
                  </p>

                  {/* Relative Updated Time */}
                  <p className="text-[10px] text-zinc-400">
                    {formatRelativeTime(project.updated_at)}
                  </p>
                </div>
              </div>

              {/* Bottom Quick Action Bar */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400 group-hover:text-zinc-300">
                <span className="text-[11px]">คลิกเพื่อเปิดแก้ไข (0 เครดิต)</span>
                <span className="text-orange-400 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                  เปิดใน Editor
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
