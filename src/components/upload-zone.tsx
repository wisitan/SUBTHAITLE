'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, calculateCreditUsage } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { extractAudioFromMedia, AudioExtractProgress } from '@/lib/audio-extract';
import { transcribeAudio } from '@/lib/transcribe';
import { saveVideoToCache } from '@/lib/video-cache';
import { saveProjectToCloud, uploadProxyToR2 } from '@/lib/projects-client';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  ArrowRight,
  Loader2,
  Sparkles,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';

export function UploadZone() {
  const router = useRouter();
  const { user, tier, signInWithGoogle } = useAuth();
  const {
    file,
    setFile,
    videoUrl,
    setVideoUrl,
    audioBlob,
    setAudioBlob,
    mediaDuration,
    setMediaDuration,
    setStatus,
    errorMessage,
    setErrorMessage,
    providerMode,
    groqApiKey,
    creditsMinutes,
    setCaptions,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [extractProgress, setExtractProgress] = useState<AudioExtractProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMessage, setTranscribeMessage] = useState('');
  const [transcribeProgressPercent, setTranscribeProgressPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTranscribing) {
      setTranscribeProgressPercent(12);
      interval = setInterval(() => {
        setTranscribeProgressPercent((prev) => {
          if (prev < 35) return prev + 6;
          if (prev < 65) return prev + 3;
          if (prev < 88) return prev + 1.5;
          if (prev < 96) return prev + 0.5;
          return prev;
        });
      }, 400);
    } else {
      setTranscribeProgressPercent(0);
    }
    return () => clearInterval(interval);
  }, [isTranscribing]);

  // Reset previous finished file on home page mount so upload zone is always clean & ready
  useEffect(() => {
    const s = useAppStore.getState();
    if (s.status === 'ready' || s.captions.length > 0) {
      s.setFile(null);
      s.setVideoUrl(null);
      s.setAudioBlob(null);
      s.setMediaDuration(0);
      s.setStatus('idle', 0, '');
      s.setErrorMessage(null);
    }
  }, []);

  const isBYOK = (providerMode === 'byok' || providerMode === 'local') && Boolean(groqApiKey);
  const isFreeMode = providerMode === 'free' || providerMode === 'google_free' || providerMode === 'groq_free';

  const handleFile = useCallback(
    async (selectedFile: File) => {
      setErrorMessage(null);
      setCaptions([]);

      // Validate file format
      const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.mp3', '.wav', '.m4a', '.aac', '.ogg'];
      const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      const isValidType =
        selectedFile.type.startsWith('video/') ||
        selectedFile.type.startsWith('audio/') ||
        validExtensions.includes(fileExt);

      if (!isValidType) {
        setErrorMessage('กรุณาเลือกไฟล์วิดีโอ (MP4, MOV, WebM, MKV) หรือไฟล์เสียง (MP3, WAV, M4A) เท่านั้น');
        return;
      }

      // Check size limit: Free mode max 100MB, Credits mode max 1.5GB (1500MB)
      const maxFreeSizeBytes = 100 * 1024 * 1024; // 100 MB
      const maxCreditSizeBytes = 1500 * 1024 * 1024; // 1.5 GB

      if (isFreeMode && selectedFile.size > maxFreeSizeBytes) {
        setErrorMessage(
          `⚠️ ขนาดไฟล์ (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) เกินกำหนด 100 MB สำหรับโหมดใช้งานฟรี กรุณาเลือกไฟล์ที่เล็กลง หรือเปลี่ยนเป็นโหมด "โควต้าผู้สนับสนุน" เพื่ออัปโหลดไฟล์ขนาดใหญ่ได้สูงสุด 1.5 GB ค่ะ`
        );
        return;
      }

      if (selectedFile.size > maxCreditSizeBytes) {
        setErrorMessage(
          `⚠️ ขนาดไฟล์ (${(selectedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB) เกินกำหนดสูงสุด 1.5 GB ต่อไฟล์ของระบบ เพื่อความเสถียรในการประมวลผล กรุณาบีบอัดวิดีโอหรือเลือกไฟล์ที่มีขนาดไม่เกิน 1.5 GB นะคะ`
        );
        return;
      }

      // Revoke old object URL if exists to prevent memory leak
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      // Save file and create preview URL
      setFile(selectedFile);
      const objUrl = URL.createObjectURL(selectedFile);
      setVideoUrl(objUrl);

      // Automatically extract audio if it's a video file or non-mp3 audio
      const isCleanMp3 = selectedFile.type === 'audio/mpeg' || selectedFile.name.endsWith('.mp3');
      if (!isCleanMp3 || selectedFile.type.startsWith('video/') || selectedFile.name.match(/\.(mp4|mov|webm|mkv|wav|m4a|aac|flac|ogg)$/i)) {
        setIsExtracting(true);
        setStatus('extracting_audio', 10, 'กำลังเตรียมเครื่องมือสกัดเสียง...');

        try {
          const blob = await extractAudioFromMedia(selectedFile, (p) => {
            setExtractProgress(p);
            setStatus('extracting_audio', Math.round(p.ratio * 100), p.message);
          });

          setAudioBlob(blob);
          setIsExtracting(false);
          setStatus('idle', 100, 'สกัดไฟล์เสียงสำเร็จ พร้อมถอดเสียง');
        } catch (err) {
          console.error('Audio extraction failed:', err);
          setIsExtracting(false);
          // Fallback: use the original file as audio blob if extraction fails
          setAudioBlob(selectedFile);
          setStatus('idle', 0, 'พร้อมถอดเสียง');
        }
      } else {
        // Direct clean MP3 audio file
        setAudioBlob(selectedFile);
        setStatus('idle', 0, 'พร้อมถอดเสียง');
      }
    },
    [isFreeMode, setAudioBlob, setCaptions, setErrorMessage, setFile, setStatus, setVideoUrl, videoUrl]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setFile(null);
    setVideoUrl(null);
    setAudioBlob(null);
    setExtractProgress(null);
    setIsExtracting(false);
    setIsTranscribing(false);
    setTranscribeMessage('');
    setCaptions([]);
    setStatus('idle', 0, '');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartTranscribe = async () => {
    if (!user && !isBYOK && providerMode !== 'local') {
      signInWithGoogle();
      return;
    }

    if (!audioBlob) {
      setErrorMessage('ไม่พบไฟล์เสียงสำหรับการถอดข้อความ กรุณาเลือกไฟล์ใหม่อีกครั้ง');
      return;
    }

    // Duration limits pre-check
    if (isFreeMode && mediaDuration > 125) {
      setErrorMessage(
        '⚠️ คลิปวิดีโอยาวเกิน 2 นาทีสำหรับโหมดใช้งานฟรี กรุณาสลับไปใช้โหมด "โควต้าผู้สนับสนุน" เพื่อถอดเสียงคลิปยาว หรือตัดแบ่งคลิปก่อนค่ะ'
      );
      return;
    }
    if (providerMode === 'credits' && mediaDuration > 1830) {
      setErrorMessage(
        '⚠️ คลิปวิดีโอยาวเกิน 30 นาทีซึ่งเป็นขีดจำกัดสูงสุดต่อคลิปของระบบ เพื่อความเสถียรในการประมวลผล กรุณาตัดแบ่งคลิปเป็นช่วงไม่เกิน 30 นาทีนะคะ'
      );
      return;
    }

    setErrorMessage(null);
    setIsTranscribing(true);
    setStatus('transcribing', 20, 'กำลังเตรียมส่งไฟล์เสียง...');
    setTranscribeMessage('กำลังส่งไฟล์เสียงไปยัง AI...');
    abortControllerRef.current = new AbortController();

    try {
      const results = await transcribeAudio(
        audioBlob,
        (msg) => {
          setTranscribeMessage(msg);
        },
        { userId: user?.id, tier, signal: abortControllerRef.current.signal }
      );

      setCaptions(results);
      const projectName = file?.name || 'SUBTHAITLE Project';
      useAppStore.getState().setProjectTitle(projectName);

      // Auto-save initial project to Cloud (Supabase + Cloudflare R2 Proxy)
      if (user?.id) {
        try {
          const storeState = useAppStore.getState();
          let proxyUrl: string | null = null;
          let thumbnailUrl: string | null = null;

          if (file) {
            setStatus('uploading', 88, 'กำลังสร้างรูปตัวอย่าง Thumbnail และซิงค์วิดีโอขึ้น Cloudflare R2...');
            setTranscribeMessage('กำลังบันทึกวิดีโอขึ้น Cloudflare R2 (720p Proxy)...');
            setTranscribeProgressPercent(88);

            // Generate thumbnail and upload proxy in parallel
            try {
              const thumbPromise = generateVideoThumbnail(file, 0.5).then(async ({ blob, dataUrl }) => {
                const uploadedThumb = await uploadProxyToR2(blob, 'thumb_' + user.id, `${Date.now()}_thumb.jpg`);
                return uploadedThumb || dataUrl;
              }).catch(() => null);

              const proxyPromise = uploadProxyToR2(file, 'initial', file.name);

              const [thumbResult, proxyResult] = await Promise.all([thumbPromise, proxyPromise]);
              thumbnailUrl = thumbResult;
              proxyUrl = proxyResult;
            } catch (mediaErr) {
              console.warn('[Thumbnail / Proxy Generation Warning]:', mediaErr);
            }
          }

          setStatus('uploading', 96, 'กำลังบันทึกโปรเจกต์ลงคลาวด์...');
          setTranscribeMessage('กำลังบันทึกโปรเจกต์ลงคลาวด์...');
          setTranscribeProgressPercent(96);

          const savedProject = await saveProjectToCloud({
            userId: user.id,
            title: projectName,
            duration: mediaDuration,
            thumbnailUrl,
            captions: results,
            rawWords: storeState.rawWords,
            style: storeState.style,
            aspectRatio: storeState.aspectRatio,
            originalFilename: file?.name,
            proxyUrl,
            file,
          });

          if (savedProject?.id) {
            useAppStore.getState().setCurrentProjectId(savedProject.id);
            if (savedProject.proxy_url || proxyUrl) {
              useAppStore.getState().setProxyUrl(savedProject.proxy_url || proxyUrl);
            }
            if (file) {
              saveVideoToCache(savedProject.id, file);
            }
          }
        } catch (saveErr) {
          console.warn('[Auto-Save Initial Project Error]:', saveErr);
        }
      }

      if (file) {
        saveVideoToCache(projectName, file);
      }

      setStatus('ready', 100, 'เสร็จสมบูรณ์! กำลังเปิดหน้าตัดต่อ...');
      setTranscribeMessage('เสร็จสมบูรณ์! กำลังเปิดหน้าโปรแกรมตัดต่อ...');
      setTranscribeProgressPercent(100);

      setTimeout(() => {
        router.push('/editor');
      }, 350);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Transcription cancelled by user');
        setIsTranscribing(false);
        setStatus('idle', 0, '');
        setTranscribeMessage('');
        return;
      }
      console.error('Transcription error:', err);
      setIsTranscribing(false);
      setStatus('error', 0, 'การถอดเสียงล้มเหลว');
      setErrorMessage(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการถอดเสียง'
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {!file ? (
        /* Drag & Drop Upload Zone */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center min-h-[300px] group ${
            isDragging
              ? 'border-orange-500 bg-orange-500/15 scale-[1.01] shadow-2xl'
              : 'border-zinc-700/80 bg-zinc-900/95 hover:border-orange-500/80 hover:bg-[#1a1a20] shadow-xl'
          }`}
        >
          {/* Subtle glow background */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent rounded-3xl pointer-events-none" />

          {/* Upload Icon */}
          <div className="w-16 h-16 rounded-2xl bg-zinc-950/90 border border-zinc-700/80 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 group-hover:border-orange-500/60 group-hover:text-orange-300 transition-all shadow-xl">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-zinc-100 mb-1">
            ลากและวางไฟล์วิดีโอของคุณที่นี่
          </h3>
          <p className="text-base text-zinc-300 mb-4">
            หรือ <span className="text-orange-400 font-semibold underline underline-offset-4">คลิกเพื่อเลือกไฟล์</span> จากคอมพิวเตอร์ของคุณ
          </p>

          {/* Badges & Limit notice */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
            <span className="px-3 py-1.5 text-xs rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-300 font-medium">
              รองรับ MP4, MOV, WebM, MKV, MP3, WAV
            </span>
            {isFreeMode ? (
              <span className="px-3 py-1.5 text-xs rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-300 font-medium">
                ฟรี: สูงสุด 100 MB • ยาว 2 นาที
              </span>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Credit: สูงสุด 1.5 GB • ยาว 30 นาที
              </span>
            )}
          </div>
        </div>
      ) : (
        /* File Selected / Extracted / Transcribed Preview Card */
        <div className="bg-zinc-900/95 border border-zinc-700/80 rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-zinc-700/70">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                {file.type.startsWith('video/') ? (
                  <FileVideo className="w-6 h-6" />
                ) : (
                  <FileAudio className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-1">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-zinc-300 mt-1">
                  <span>ขนาดวิดีโอ: {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {audioBlob && audioBlob !== file && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">
                        สกัดเสียงเหลือ: {(audioBlob.size / (1024 * 1024)).toFixed(2)} MB (ลดลง{' '}
                        {Math.round((1 - audioBlob.size / file.size) * 100)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Change file button */}
            <button
              type="button"
              disabled={isExtracting || isTranscribing}
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-xl transition-colors flex items-center gap-1.5 self-end md:self-auto disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              เปลี่ยนไฟล์
            </button>
          </div>

          {/* Extraction Progress Bar */}
          {isExtracting && (
            <div className="my-5 p-4 bg-zinc-950/80 border border-orange-500/30 rounded-2xl">
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span className="text-orange-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {extractProgress?.message || 'กำลังสกัดไฟล์เสียงในเบราว์เซอร์ (Cost ฿0)...'}
                </span>
                <span className="text-zinc-200 font-mono">
                  {Math.round((extractProgress?.ratio || 0) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((extractProgress?.ratio || 0) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-300 mt-2">
                💡 ระบบสกัดเฉพาะเสียง MP3 บนเครื่องของคุณทันที ทำให้ไม่ต้องอัปโหลดวิดีโอขนาดใหญ่ ประหยัดเน็ต 100%
              </p>
            </div>
          )}

          {/* Transcription In Progress Multi-Stage Progress Bar */}
          {isTranscribing && (
            <div className="my-5 p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/40 rounded-2xl space-y-3 shadow-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin shrink-0" />
                  <div>
                    <h5 className="text-base font-bold text-white">กำลังถอดเสียงภาษาไทยและซิงค์โปรเจกต์...</h5>
                    <p className="text-sm text-orange-200 mt-0.5">
                      {transcribeMessage ||
                        (transcribeProgressPercent < 35
                          ? 'กำลังส่งไฟล์เสียงไปยังเซิร์ฟเวอร์...'
                          : transcribeProgressPercent < 70
                          ? 'AI กำลังฟังและจับตำแหน่งเวลาของแต่ละคำ...'
                          : transcribeProgressPercent < 90
                          ? 'กำลังปรับแต่งคำศัพท์ภาษาไทยให้ถูกต้องแม่นยำ...'
                          : 'กำลังซิงค์วิดีโอขึ้น Cloudflare R2 และจัดเตรียมหน้าตัดต่อ...')}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-black font-mono text-orange-400">
                  {Math.round(transcribeProgressPercent)}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-zinc-950/80 rounded-full h-3 overflow-hidden border border-orange-500/20 p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-lg shadow-orange-500/50"
                  style={{ width: `${Math.min(100, Math.round(transcribeProgressPercent))}%` }}
                />
              </div>

              {/* Progress Steps Indicator */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 font-medium">
                <span className={transcribeProgressPercent >= 15 ? 'text-amber-400 font-semibold' : ''}>
                  1. ส่งไฟล์เสียง
                </span>
                <span>•</span>
                <span className={transcribeProgressPercent >= 45 ? 'text-amber-400 font-semibold' : ''}>
                  2. ถอดเสียงระดับคำ
                </span>
                <span>•</span>
                <span className={transcribeProgressPercent >= 75 ? 'text-amber-400 font-semibold' : ''}>
                  3. ปรับแต่งคำไทย
                </span>
                <span>•</span>
                <span className={transcribeProgressPercent >= 88 ? 'text-amber-400 font-semibold' : ''}>
                  4. ซิงค์ R2 & คลาวด์
                </span>
              </div>
            </div>
          )}

          {/* Video Preview thumbnail & Duration */}
          {videoUrl && (() => {
            const isFreeMode = providerMode === 'free' || providerMode === 'google_free' || providerMode === 'groq_free';
            const isOverFreeLimit = isFreeMode && mediaDuration > 125;
            const isOverCreditLimit = providerMode === 'credits' && mediaDuration > 1830;
            const requiredCredits = calculateCreditUsage(mediaDuration);
            const isNotEnoughCredits = providerMode === 'credits' && !isOverCreditLimit && creditsMinutes < requiredCredits;

            const formatSecs = (s: number) => {
              const m = Math.floor(s / 60);
              const sec = Math.floor(s % 60);
              return `${m}:${sec.toString().padStart(2, '0')}`;
            };

            return (
              <div className="my-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-zinc-950/80 rounded-2xl border border-zinc-700/70">
                  <video
                    src={videoUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      setMediaDuration(e.currentTarget.duration);
                    }}
                    className="w-full sm:w-48 max-h-36 rounded-xl bg-black object-contain border border-zinc-700/80 shadow-md"
                  />
                  <div className="flex-1 text-sm text-zinc-300 space-y-1.5 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                        ความยาววิดีโอ: <strong className="text-amber-400 font-mono text-base">{mediaDuration ? formatSecs(mediaDuration) : 'กำลังโหลด...'}</strong>
                      </span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        พร้อมเริ่มถอดเสียง
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300">
                      โหมดที่เลือก:{' '}
                      <span className="text-zinc-100 font-bold">
                        {isFreeMode
                          ? 'ฟรี 5 คลิป/วัน (สูงสุด 2 นาที)'
                          : providerMode === 'credits'
                          ? `Credit ที่มี (ใช้ ${requiredCredits} นาที / คงเหลือ ${creditsMinutes} นาที)`
                          : 'Credit ที่มี'}
                      </span>
                    </p>

                    {/* Credit Calculation Details */}
                    {providerMode === 'credits' && mediaDuration > 0 && !isOverCreditLimit && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                        <span>
                          💎 คลิปนี้ใช้ <strong>{requiredCredits} เครดิต (นาที)</strong>
                        </span>
                        <span className="font-bold text-white">คงเหลือ {creditsMinutes} นาที</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning: Over Free Limit */}
                {isOverFreeLimit && (
                  <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 shadow-md">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <span className="font-bold block text-white">⚠️ คลิปวิดีโอยาวเกิน 2 นาทีสำหรับโหมด Free</span>
                      <p>
                        คลิปนี้ยาว {formatSecs(mediaDuration)} ซึ่งเกินโควต้า 2 นาทีของโหมดฟรี กรุณาสลับไปใช้โหมด <strong>&ldquo;Credit ที่มี&rdquo;</strong> เพื่อถอดเสียงคลิปยาว หรือตัดแบ่งคลิปก่อนค่ะ
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning: Over Credit Limit (> 30 Mins) */}
                {isOverCreditLimit && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 shadow-md">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <span className="font-bold block text-white">⚠️ คลิปวิดีโอยาวเกิน 30 นาที</span>
                      <p>
                        คลิปนี้ยาว {formatSecs(mediaDuration)} ซึ่งเกินกำหนดสูงสุด 30 นาทีต่อคลิปของระบบ เพื่อป้องกันปัญหาเบราว์เซอร์ค้างหรือส่งข้อมูลไม่สำเร็จ กรุณาตัดแบ่งคลิปเป็นช่วงไม่เกิน 30 นาทีนะคะ
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning: Not Enough Credits */}
                {isNotEnoughCredits && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3 animate-in fade-in duration-200 shadow-md">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block text-white">โควต้าของคุณไม่เพียงพอ</span>
                        <p>
                          คลิปนี้ต้องใช้ <strong>{requiredCredits} นาที</strong> แต่คุณมีโควต้าคงเหลือ <strong>{creditsMinutes} นาที</strong>
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/donate"
                      className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
                    >
                      <span>☕ เลี้ยงกาแฟทีมงาน</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action Trigger Button */}
          <div className="mt-5 flex justify-end gap-3">
            {!user && !isBYOK && providerMode !== 'local' ? (
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => signInWithGoogle()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-base flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="w-5 h-5 text-zinc-950" />
                <span>เข้าสู่ระบบด้วย Google เพื่อเริ่มถอดเสียง</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  isExtracting ||
                  isTranscribing ||
                  ((providerMode === 'free' || providerMode === 'google_free' || providerMode === 'groq_free') && mediaDuration > 125) ||
                  (providerMode === 'credits' && mediaDuration > 1830) ||
                  (providerMode === 'credits' && creditsMinutes < calculateCreditUsage(mediaDuration))
                }
                onClick={handleStartTranscribe}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{transcribeMessage || 'กำลังถอดเสียง...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {isFreeMode
                        ? 'เริ่มถอดเสียงด้วย AI (โหมดฟรี)'
                        : providerMode === 'credits'
                        ? `เริ่มถอดเสียงด้วย Credit (หัก ${calculateCreditUsage(mediaDuration)} นาที)`
                        : 'เริ่มถอดเสียงด้วย AI'}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">เกิดข้อผิดพลาด</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
