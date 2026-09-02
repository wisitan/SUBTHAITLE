'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Film,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tv,
  Zap,
  RotateCcw,
  Upload,
  HardDrive,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { burnSubtitlesToVideo, VideoResolution, BurnProgress } from '@/lib/burn';
import { saveVideoToCache } from '@/lib/video-cache';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BurnVideoModal({ isOpen, onClose }: Props) {
  const file = useAppStore((s) => s.file);
  const setFile = useAppStore((s) => s.setFile);
  const setVideoUrl = useAppStore((s) => s.setVideoUrl);
  const captions = useAppStore((s) => s.captions);
  const style = useAppStore((s) => s.style);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projectTitle = useAppStore((s) => s.projectTitle);

  const [mounted, setMounted] = useState(false);
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [isBurning, setIsBurning] = useState(false);
  const [progress, setProgress] = useState<BurnProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const filePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Declarative Object URL management tied strictly to renderedBlob lifecycle
  useEffect(() => {
    if (!renderedBlob) {
      setDownloadUrl(null);
      return;
    }

    const url = URL.createObjectURL(renderedBlob);
    setDownloadUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [renderedBlob]);

  if (!isOpen || !mounted) return null;

  const handleReset = () => {
    setRenderedBlob(null);
    setProgress(null);
    setErrorMsg(null);
    setIsBurning(false);
  };

  const handleLocateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVideoUrl(URL.createObjectURL(selectedFile));
      const key = currentProjectId || projectTitle || selectedFile.name;
      if (key) saveVideoToCache(key, selectedFile);
      if (currentProjectId) saveVideoToCache(currentProjectId, selectedFile);
      setErrorMsg(null);
    }
  };

  const handleStartBurn = async () => {
    if (!file) {
      setErrorMsg('กรุณาเลือกหรือเชื่อมต่อไฟล์วิดีโอต้นฉบับก่อนทำการเรนเดอร์ค่ะ');
      return;
    }

    setIsBurning(true);
    setErrorMsg(null);
    setRenderedBlob(null);

    try {
      const outputBlob = await burnSubtitlesToVideo({
        videoFile: file,
        captions,
        style,
        resolution,
        onProgress: (prog) => setProgress(prog),
      });

      setRenderedBlob(outputBlob);
    } catch (err: unknown) {
      console.error('Burn video error:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเรนเดอร์วิดีโอ';
      setErrorMsg(message);
    } finally {
      setIsBurning(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const originalName = file?.name ? file.name.replace(/\.[^/.]+$/, '') : (projectTitle || 'subthaitle_video');
    const filename = `${originalName}_with_subtitles.mp4`;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClose = () => {
    if (isBurning) {
      if (!confirm('การเรนเดอร์กำลังดำเนินอยู่ ต้องการยกเลิกและปิดหน้าต่างหรือไม่?')) {
        return;
      }
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-[#12121c] border border-zinc-700/80 shadow-2xl space-y-4">
        {/* Hidden File Picker for Relinking Media */}
        <input
          ref={filePickerRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={handleLocateFile}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ฝังซับไตเติลลงวิดีโอ MP4 (Burn Subtitles)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                ประมวลผลบน GPU เครื่องของคุณ 100% ปลอดภัย คมชัดระดับ Master
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Missing File / Media Offline Warning & Relink Box */}
        {!file && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">ต้องการไฟล์วิดีโอต้นฉบับสำหรับการเรนเดอร์</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  เนื่องจากคุณเปิดโปรเจกต์นี้จากคลาวด์ กรุณาเลือกไฟล์วิดีโอ <strong className="text-amber-300">{projectTitle || 'ต้นฉบับ'}</strong> จากเครื่องนี้เพื่อเริ่มเรนเดอร์ความละเอียดสูงค่ะ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => filePickerRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>📂 เชื่อมต่อไฟล์วิดีโอต้นฉบับ (Locate Media)</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Resolution Options (if not completed) */}
        {!renderedBlob && !isBurning && (
          <div className="space-y-3">
            <label className="text-sm font-bold text-zinc-200 block">
              เลือกความละเอียดของวิดีโอ (Video Resolution):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: 720p */}
              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  resolution === '720p'
                    ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1.5 text-zinc-100">
                    <Zap className="w-4 h-4 text-amber-400" />
                    720p HD
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">เรนเดอร์ด่วน ไฟล์เบา ส่งงานไว</p>
              </button>

              {/* Option 2: 1080p */}
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  resolution === '1080p'
                    ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1.5 text-orange-300">
                    <Tv className="w-4 h-4 text-orange-400" />
                    1080p Full HD
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">มาตรฐานคมชัด TikTok / Reels</p>
              </button>

              {/* Option 3: 4K */}
              <button
                type="button"
                onClick={() => setResolution('4k')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer ${
                  resolution === '4k'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1.5 text-rose-300">
                    <Film className="w-4 h-4 text-rose-400" />
                    4K Ultra HD
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  คมชัดสูงสุดสำหรับโปรดักชั่น
                </p>
              </button>
            </div>

            {/* Hint for typography retention */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-200 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>สไตล์และเอฟเฟกต์ที่จะฝังลงในวิดีโอ:</span>
              </div>
              <p className="text-zinc-300 pl-5.5 leading-relaxed">
                ฟอนต์ <strong>{style.fontFamily}</strong> • ขนาด {style.fontSize}px • {style.hasOutline ? `ขอบหนา ${style.outlineWidth}px` : 'ไร้ขอบ'} • {style.enableWordHighlight ? 'ไฮไลท์คำพูดตามเสียงจริง ✨' : 'ข้อความนิ่ง'}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Burning in Progress */}
        {isBurning && progress && (
          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                <span>{progress.message}</span>
              </span>
              <span className="font-mono font-bold text-orange-400">{progress.percent}%</span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <p className="text-xs text-zinc-400 text-center">
              💡 กรุณาอย่าปิดแท็บเบราว์เซอร์ขณะที่ระบบกำลังเรนเดอร์วิดีโอ
            </p>
          </div>
        )}

        {/* Step 3: Burning Completed */}
        {renderedBlob && downloadUrl && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">เรนเดอร์วิดีโอพร้อมซับไตเติลสำเร็จ! 🎉</h4>
              <p className="text-sm text-zinc-300">
                ขนาดไฟล์: {(renderedBlob.size / (1024 * 1024)).toFixed(2)} MB • ความละเอียด {resolution}
              </p>
            </div>

            {/* Video Preview Player */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black max-h-[220px]">
              <video src={downloadUrl} controls className="w-full h-full max-h-[220px] object-contain" />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          {!renderedBlob ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isBurning}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleStartBurn}
                disabled={isBurning || !file}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBurning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังเรนเดอร์...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>เริ่มเรนเดอร์วิดีโอ ({resolution})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer mr-auto shadow-sm"
                title="กลับไปตั้งค่าและเรนเดอร์วิดีโอใหม่อีกครั้ง"
              >
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span>เรนเดอร์ใหม่</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดวิดีโอ MP4</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
