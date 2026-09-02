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
  Cloud,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { burnSubtitlesToVideo, VideoResolution, VideoFps, BurnProgress } from '@/lib/burn';
import { saveVideoToCache } from '@/lib/video-cache';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BurnVideoModal({ isOpen, onClose }: Props) {
  const file = useAppStore((s) => s.file);
  const setFile = useAppStore((s) => s.setFile);
  const setVideoUrl = useAppStore((s) => s.setVideoUrl);
  const proxyUrl = useAppStore((s) => s.proxyUrl);
  const originalFilename = useAppStore((s) => s.originalFilename);
  const captions = useAppStore((s) => s.captions);
  const style = useAppStore((s) => s.style);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projectTitle = useAppStore((s) => s.projectTitle);

  const [mounted, setMounted] = useState(false);
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [fps, setFps] = useState<VideoFps>('auto');
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

  const handleStartBurn = async (forceProxy: boolean = false) => {
    let videoToBurn: File | Blob | null = file;

    // If local file is missing but proxy is available and requested
    if (!videoToBurn && proxyUrl && forceProxy) {
      setIsBurning(true);
      setProgress({
        percent: 5,
        ratio: 0.05,
        stage: 'preparing_media',
        message: 'กำลังดาวน์โหลดวิดีโอ Proxy จาก Cloudflare R2...',
      });
      try {
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('ไม่สามารถดาวน์โหลดวิดีโอ Proxy จาก Cloudflare R2 ได้');
        const blob = await res.blob();
        videoToBurn = new File([blob], `${projectTitle || 'proxy_video'}.mp4`, { type: 'video/mp4' });
      } catch (fetchErr) {
        console.error('Fetch proxy error:', fetchErr);
        setErrorMsg('ไม่สามารถดึงไฟล์ Proxy ได้ กรุณาเชื่อมต่อไฟล์ต้นฉบับเพื่อเรนเดอร์ค่ะ');
        setIsBurning(false);
        return;
      }
    }

    if (!videoToBurn) {
      setErrorMsg('กรุณาเลือกหรือเชื่อมต่อไฟล์วิดีโอต้นฉบับก่อนทำการเรนเดอร์ค่ะ');
      return;
    }

    setIsBurning(true);
    setErrorMsg(null);
    setRenderedBlob(null);

    const targetRes = forceProxy ? '720p' : resolution;

    try {
      const outputBlob = await burnSubtitlesToVideo({
        videoFile: videoToBurn as File,
        captions,
        style,
        resolution: targetRes,
        fps,
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
    const baseName = file?.name || originalFilename || projectTitle || 'subthaitle_video';
    const cleanName = baseName.replace(/\.[^/.]+$/, '');
    const filename = `${cleanName}_with_subtitles.mp4`;

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

  const displayName = originalFilename || projectTitle || file?.name || 'ต้นฉบับ';

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
                {file
                  ? '⚡ เรนเดอร์ด้วยไฟล์ Master คมชัดเต็ม 100% ในเครื่อง'
                  : proxyUrl
                  ? '☁️ เรนเดอร์ด้วย Cloudflare R2 Proxy หรือเชื่อมต่อไฟล์ต้นฉบับ'
                  : 'ประมวลผลบน GPU เครื่องของคุณ 100% ปลอดภัย'}
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

        {/* Missing File / Media Offline: Show 2 Smart Options */}
        {!file && !renderedBlob && !isBurning && (
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">
                  {proxyUrl ? 'เลือกวิธีส่งออกวิดีโอ (Export Choice)' : 'ต้องการไฟล์วิดีโอเพื่อเรนเดอร์'}
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  ไฟล์ต้นฉบับ <strong className="text-amber-300">[{displayName}]</strong> ยังไม่ถูกโหลดเข้าเครื่องนี้
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Option 1: Locate Master File */}
              <button
                type="button"
                onClick={() => filePickerRef.current?.click()}
                className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs flex flex-col justify-between gap-1 transition-all shadow-md cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <Upload className="w-3.5 h-3.5" />
                  <span>📂 เชื่อมต่อไฟล์ต้นฉบับ</span>
                </span>
                <span className="text-[10px] font-medium text-zinc-900 opacity-90">
                  เลือกไฟล์เดิมเพื่อเรนเดอร์ Source / 1080p
                </span>
              </button>

              {/* Option 2: 720p Cloud Proxy */}
              {proxyUrl && (
                <button
                  type="button"
                  onClick={() => handleStartBurn(true)}
                  className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs flex flex-col justify-between gap-1 transition-all cursor-pointer text-left"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>⚡ เรนเดอร์ 720p Proxy</span>
                  </span>
                  <span className="text-[10px] font-normal text-zinc-400">
                    ดึงจาก R2 ทันที ไม่ต้องใช้ไฟล์เดิม
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Resolution & FPS Options (Shown when Master file is present) */}
        {!renderedBlob && !isBurning && file && (
          <div className="space-y-4">
            {/* 1. Resolution */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200 block">
                คุณภาพความละเอียด (Video Resolution):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option 1: 720p */}
                <button
                  type="button"
                  onClick={() => setResolution('720p')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    resolution === '720p'
                      ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5 text-zinc-100">
                    <Zap className="w-4 h-4 text-amber-400" />
                    720p HD
                  </span>
                  <p className="text-[11px] text-zinc-400">เรนเดอร์ด่วน ไฟล์เบา ส่งงานไว</p>
                </button>

                {/* Option 2: 1080p */}
                <button
                  type="button"
                  onClick={() => setResolution('1080p')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    resolution === '1080p'
                      ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5 text-orange-300">
                    <Tv className="w-4 h-4 text-orange-400" />
                    1080p Full HD
                  </span>
                  <p className="text-[11px] text-zinc-400">มาตรฐานคมชัด TikTok / Reels</p>
                </button>

                {/* Option 3: Source */}
                <button
                  type="button"
                  onClick={() => setResolution('source')}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1 cursor-pointer ${
                    resolution === 'source'
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Source (ต้นฉบับ)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    ขนาดเดิม 100% ไม่ยืดสัดส่วน
                  </p>
                </button>
              </div>
            </div>

            {/* 2. FPS Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-zinc-200">
                  อัตราเฟรมเรต (FPS):
                </label>
                <span className="text-xs text-orange-400 font-mono font-semibold">
                  {fps === 'auto' ? 'Auto (เท่าไฟล์ต้นฉบับ)' : `${fps} FPS`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Auto */}
                <button
                  type="button"
                  onClick={() => setFps('auto')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    fps === 'auto'
                      ? 'bg-orange-500/20 border-orange-500 text-white font-bold ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-100">Auto (ต้นฉบับ)</span>
                  <span className="text-[10px] text-emerald-400 font-medium">แนะนำ</span>
                </button>

                {/* 24 fps */}
                <button
                  type="button"
                  onClick={() => setFps(24)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    fps === 24
                      ? 'bg-orange-500/20 border-orange-500 text-white font-bold ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-100">24 fps</span>
                  <span className="text-[10px] text-zinc-500">Cinematic</span>
                </button>

                {/* 30 fps */}
                <button
                  type="button"
                  onClick={() => setFps(30)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    fps === 30
                      ? 'bg-orange-500/20 border-orange-500 text-white font-bold ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-100">30 fps</span>
                  <span className="text-[10px] text-zinc-500">Social Media</span>
                </button>

                {/* 60 fps */}
                <button
                  type="button"
                  onClick={() => setFps(60)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    fps === 60
                      ? 'bg-orange-500/20 border-orange-500 text-white font-bold ring-1 ring-orange-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-100">60 fps</span>
                  <span className="text-[10px] text-zinc-500">Smooth Video</span>
                </button>
              </div>
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
              กำลังประมวลผลบนเครื่องของคุณ... กรุณาอย่าปิดแท็บนี้จนกว่าจะเสร็จสิ้น
            </p>
          </div>
        )}

        {/* Step 3: Render Complete (Show Download button) */}
        {renderedBlob && downloadUrl && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">เรนเดอร์วิดีโอสำเร็จเรียบร้อย! 🎉</h4>
              <p className="text-xs text-zinc-300 mt-1">
                ขนาดไฟล์: {(renderedBlob.size / (1024 * 1024)).toFixed(2)} MB • พร้อมดาวน์โหลดแล้วค่ะ
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
              {file && (
                <button
                  type="button"
                  onClick={() => handleStartBurn(false)}
                  disabled={isBurning}
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
                      <span>
                        เริ่มเรนเดอร์วิดีโอ ({resolution === 'source' ? 'Source' : resolution}{fps !== 'auto' ? ` • ${fps}fps` : ''})
                      </span>
                    </>
                  )}
                </button>
              )}
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
