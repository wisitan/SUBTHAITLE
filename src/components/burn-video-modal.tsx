'use client';

import React, { useState } from 'react';
import {
  X,
  Film,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Tv,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { burnSubtitlesToVideo, cancelBurn, VideoResolution, BurnProgress } from '@/lib/burn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BurnVideoModal({ isOpen, onClose }: Props) {
  const file = useAppStore((s) => s.file);
  const captions = useAppStore((s) => s.captions);
  const style = useAppStore((s) => s.style);
  const tier = useAppStore((s) => s.tier);

  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [isBurning, setIsBurning] = useState(false);
  const [progress, setProgress] = useState<BurnProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartBurn = async () => {
    if (!file) {
      setErrorMsg('กรุณาอัปโหลดไฟล์วิดีโอก่อนทำการเรนเดอร์');
      return;
    }

    if (resolution === '4k' && tier !== 'meal') {
      setErrorMsg('ความละเอียด 4K Ultra HD ปลดล็อกเฉพาะสถานะเลี้ยงข้าว (299฿) ค่ะ');
      return;
    }

    setIsBurning(true);
    setErrorMsg(null);
    setRenderedBlob(null);
    setDownloadUrl(null);

    try {
      const outputBlob = await burnSubtitlesToVideo({
        videoFile: file,
        captions,
        style,
        resolution,
        onProgress: (prog) => setProgress(prog),
      });

      setRenderedBlob(outputBlob);
      const url = URL.createObjectURL(outputBlob);
      setDownloadUrl(url);
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
    const originalName = file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'video';
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
      cancelBurn();
    }
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ฝังซับไตเติลลงวิดีโอ MP4 (Burn Subtitles)</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                ประมวลผลบนเครื่องของคุณ 100% ปลอดภัย ไม่ต้องอัปโหลดวิดีโอไปเซิร์ฟเวอร์
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

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Resolution Options (if not completed) */}
        {!renderedBlob && !isBurning && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 block">
              เลือกความละเอียดของวิดีโอ (Video Resolution):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: 720p */}
              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  resolution === '720p'
                    ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    720p HD
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">เรนเดอร์ด่วน ไฟล์เบา ส่งงานไว</p>
              </button>

              {/* Option 2: 1080p */}
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  resolution === '1080p'
                    ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-orange-300">
                    <Tv className="w-3.5 h-3.5 text-orange-400" />
                    1080p Full HD
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">มาตรฐานคมชัด TikTok / Reels</p>
              </button>

              {/* Option 3: 4K (Tier 299 Exclusive) */}
              <button
                type="button"
                onClick={() => {
                  if (tier === 'meal') {
                    setResolution('4k');
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 ${
                  tier !== 'meal'
                    ? 'bg-zinc-900/30 border-zinc-800/60 text-zinc-500 cursor-not-allowed opacity-80'
                    : resolution === '4k'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40 cursor-pointer'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-rose-300">
                    <Film className="w-3.5 h-3.5 text-rose-400" />
                    4K Ultra HD
                  </span>
                  {tier !== 'meal' && (
                    <Lock className="w-3 h-3 text-rose-400" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400">
                  {tier === 'meal' ? 'คมชัดสูงสุดสำหรับโปรดักชั่น' : 'ปลดล็อกเฉพาะ Tier 299฿'}
                </p>
              </button>
            </div>

            {/* Hint for typography retention */}
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>สไตล์และเอฟเฟกต์ที่ระบบจะฝังลงในวิดีโอ:</span>
              </div>
              <p className="text-zinc-400 pl-5 leading-relaxed">
                ฟอนต์ <strong>{style.fontFamily}</strong> • ขนาด {style.fontSize}px • {style.hasOutline ? `ขอบหนา ${style.outlineWidth}px` : 'ไร้ขอบ'} • {style.enableWordHighlight ? 'ไฮไลท์คำพูดตามเสียงจริง ✨' : 'ข้อความนิ่ง'}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Burning in Progress */}
        {isBurning && progress && (
          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                <span>{progress.message}</span>
              </span>
              <span className="font-mono font-bold text-orange-400">{progress.percent}%</span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <p className="text-[10px] text-zinc-400 text-center">
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
              <h4 className="text-sm font-bold text-white">เรนเดอร์วิดีโอพร้อมซับไตเติลสำเร็จ! 🎉</h4>
              <p className="text-xs text-zinc-400">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleStartBurn}
                disabled={isBurning}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBurning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังเรนเดอร์...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    <span>เริ่มเรนเดอร์วิดีโอ ({resolution})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดวิดีโอ MP4</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
