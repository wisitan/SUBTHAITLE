'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/context/auth-context';
import { extractAudioFromMedia, AudioExtractProgress } from '@/lib/audio-extract';
import { transcribeAudio } from '@/lib/transcribe';
import { generateSrt, generateVtt } from '@/lib/srt';
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
  SlidersHorizontal,
  Download,
  Flame,
  Film,
  AlignLeft,
  Settings2,
  LogIn,
} from 'lucide-react';

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
    setMediaDuration,
    setStatus,
    errorMessage,
    setErrorMessage,
    provider,
    groqApiKey,
    pacingMode,
    customMaxWords,
    setPacingMode,
    captions,
    setCaptions,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [extractProgress, setExtractProgress] = useState<AudioExtractProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMessage, setTranscribeMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBYOK = provider === 'groq' && Boolean(groqApiKey);
  const isPaid = tier === 'tier_99' || tier === 'tier_299';
  const isUnlimitedSize = isBYOK || isPaid;

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

      // Check size limit (Free tier limit = 100MB)
      const maxFreeSizeBytes = 100 * 1024 * 1024;
      if (!isUnlimitedSize && selectedFile.size > maxFreeSizeBytes) {
        setErrorMessage(
          `ขนาดไฟล์ (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) เกินโควต้าฟรี 100 MB กรุณาเลือกไฟล์ที่เล็กลง หรือใส่ API Key ของตัวเอง (BYOK) เพื่ออัปโหลดได้ไม่จำกัด`
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
    [isUnlimitedSize, setAudioBlob, setCaptions, setErrorMessage, setFile, setStatus, setVideoUrl, videoUrl]
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
    if (!user && !isBYOK && provider !== 'local') {
      signInWithGoogle();
      return;
    }

    if (!audioBlob) {
      setErrorMessage('ไม่พบไฟล์เสียงสำหรับการถอดข้อความ กรุณาเลือกไฟล์ใหม่อีกครั้ง');
      return;
    }

    setErrorMessage(null);
    setIsTranscribing(true);
    setStatus('transcribing', 20, 'กำลังเตรียมส่งไฟล์เสียง...');

    try {
      const results = await transcribeAudio(
        audioBlob,
        (msg) => {
          setTranscribeMessage(msg);
        },
        { userId: user?.id, tier }
      );

      setCaptions(results);
      setStatus('ready', 100, 'ถอดเสียงภาษาไทยสำเร็จ!');
      setIsTranscribing(false);
      router.push('/editor');
    } catch (err) {
      console.error('Transcription error:', err);
      setIsTranscribing(false);
      setStatus('error', 0, 'การถอดเสียงล้มเหลว');
      setErrorMessage(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการถอดเสียง'
      );
    }
  };

  const totalWords = captions.reduce((acc, cue) => acc + (cue.words?.length || cue.text.split(' ').length), 0);

  const handleDownloadSrt = () => {
    if (!captions.length) return;
    const srtData = generateSrt(captions);
    const blob = new Blob([srtData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '') || 'subthaitle'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVtt = () => {
    if (!captions.length) return;
    const vttData = generateVtt(captions);
    const blob = new Blob([vttData], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '') || 'subthaitle'}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
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
            {isUnlimitedSize ? (
              <span className="px-3 py-1.5 text-xs rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                โหมดไม่จำกัดขนาดไฟล์
              </span>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-300 font-medium">
                ขนาดไฟล์สูงสุด 100 MB
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

          {/* Transcription In Progress Banner */}
          {isTranscribing && (
            <div className="my-5 p-5 bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-rose-500/15 border border-orange-500/40 rounded-2xl animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                <div>
                  <h5 className="text-base font-bold text-white">กำลังถอดเสียงภาษาไทยด้วย AI...</h5>
                  <p className="text-sm text-orange-200 mt-0.5">
                    {transcribeMessage || 'กำลังส่งไฟล์เสียงและคำนวณตำแหน่งเวลาของแต่ละคำ...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Preview thumbnail & Duration */}
          {videoUrl && !captions.length && (
            <div className="my-5 flex flex-col sm:flex-row items-center gap-4 p-4 bg-zinc-950/80 rounded-2xl border border-zinc-700/70">
              <video
                src={videoUrl}
                controls
                onLoadedMetadata={(e) => {
                  setMediaDuration(e.currentTarget.duration);
                }}
                className="w-full sm:w-48 max-h-36 rounded-xl bg-black object-contain border border-zinc-700/80 shadow-md"
              />
              <div className="flex-1 text-sm text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-100">สถานะ:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    พร้อมเริ่มถอดเสียงด้วย AI
                  </span>
                </div>
                <p>
                  เครื่องยนต์ที่ใช้:{' '}
                  <span className="text-zinc-100 font-medium">
                    {provider === 'groq'
                      ? isBYOK
                        ? groqApiKey.trim().startsWith('sk-')
                          ? 'OpenAI Whisper-1 (BYOK Mode)'
                          : 'Groq Whisper V3 (BYOK Mode)'
                        : 'Google Cloud Speech-to-Text (Standard)'
                      : 'Local Whisper (Offline Mac)'}
                  </span>
                </p>
                <p className="text-xs text-zinc-400">
                  ระบบจะถอดเสียงภาษาไทยพร้อมระบุเวลาทีละคำ (Word-level timestamps) เพื่อทำซับคาราโอเกะ
                </p>
              </div>
            </div>
          )}

          {/* Transcription Results & Pacing Card (Phase 3) */}
          {captions.length > 0 && (
            <div className="my-5 p-5 bg-zinc-950/90 rounded-2xl border border-emerald-500/40 space-y-5 animate-in fade-in duration-300 shadow-xl">
              {/* Header with Stats & Quick Export */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-700/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-base font-bold text-white flex items-center gap-2">
                      ถอดเสียงภาษาไทยสำเร็จ!
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-medium">
                        Whisper Large v3
                      </span>
                    </h5>
                    <span className="text-xs text-zinc-300">
                      มีทั้งหมด {captions.length} ท่อนซับ (~{totalWords} คำ)
                    </span>
                  </div>
                </div>

                {/* Quick SRT / VTT Download Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSrt}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:text-orange-300 hover:border-orange-500/50"
                    title="ดาวน์โหลดไฟล์ .SRT สำหรับใช้งานทั่วไป"
                  >
                    <Download className="w-4 h-4 text-orange-400" />
                    ดาวน์โหลด .SRT
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadVtt}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:text-emerald-300 hover:border-emerald-500/50"
                    title="ดาวน์โหลดไฟล์ WebVTT (.VTT)"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    ดาวน์โหลด .VTT
                  </button>
                </div>
              </div>

              {/* 🎛️ Caption Pacing / Length Selector (Killer Feature) */}
              <div className="p-4 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 hover:border-zinc-500/70 space-y-3 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-bold text-zinc-100">
                      ✂️ ปรับจังหวะความยาวท่อนซับ (Caption Pacing):
                    </span>
                  </div>
                  <span className="text-xs text-zinc-300">
                    คลิกเลือกโหมดเพื่อจัดกลุ่มคำใหม่แบบ Realtime
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Short / Shorts */}
                  <button
                    type="button"
                    onClick={() => setPacingMode('short')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pacingMode === 'short'
                        ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                        : 'bg-zinc-950/70 border-zinc-700/70 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-1.5 text-orange-300">
                        <Flame className="w-4 h-4 text-orange-400" />
                        สั้นกระชับ (3-5 คำ)
                      </span>
                      {pacingMode === 'short' && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-snug">
                      เหมาะกับ TikTok, Reels, Shorts คนดูอ่านตามทันที
                    </p>
                  </button>

                  {/* Option 2: Medium / Standard */}
                  <button
                    type="button"
                    onClick={() => setPacingMode('medium')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pacingMode === 'medium'
                        ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                        : 'bg-zinc-950/70 border-zinc-700/70 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-1.5 text-orange-300">
                        <AlignLeft className="w-4 h-4 text-amber-400" />
                        มาตรฐาน (6-9 คำ)
                      </span>
                      {pacingMode === 'medium' && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-snug">
                      เหมาะกับคลิป Vlog ทั่วไป อ่านสบาย ไม่สั้นไม่ยาวไป
                    </p>
                  </button>

                  {/* Option 3: Long / Cinema */}
                  <button
                    type="button"
                    onClick={() => setPacingMode('long')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pacingMode === 'long'
                        ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                        : 'bg-zinc-950/70 border-zinc-700/70 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-1.5 text-orange-300">
                        <Film className="w-4 h-4 text-emerald-400" />
                        ประโยคยาว (10-15 คำ)
                      </span>
                      {pacingMode === 'long' && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-snug">
                      เหมาะกับ YouTube แนวนอน, สัมภาษณ์ หรือสารคดี
                    </p>
                  </button>
                </div>

                {/* Custom Word Slider Toggle */}
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm border-t border-zinc-700/70">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    <span>หรือปรับกำหนดจำนวนคำต่อท่อนเอง:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={18}
                      value={customMaxWords}
                      aria-label="กำหนดจำนวนคำต่อท่อน"
                      onChange={(e) => {
                        const words = parseInt(e.target.value, 10);
                        setPacingMode('custom', words);
                      }}
                      className="w-36 accent-orange-500 cursor-pointer"
                    />
                    <span className="px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-orange-400 font-mono font-bold min-w-[3.5rem] text-center text-sm shadow-sm">
                      {customMaxWords} คำ
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtitle Snippet Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>ตัวอย่างท่อนซับที่จัดกลุ่มแล้ว ({captions.length} ท่อน):</span>
                  <span className="text-xs font-mono text-zinc-400">
                    คำนวณเวลาตรงตามเสียง 100%
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-2 p-4 rounded-xl bg-zinc-950/75 border border-zinc-700/70 text-sm font-mono">
                  {captions.map((cue, idx) => (
                    <div
                      key={cue.id || idx}
                      className="flex items-start gap-2.5 text-zinc-200 hover:bg-zinc-900/80 p-1.5 rounded-lg transition-colors"
                    >
                      <span className="text-orange-400 font-bold shrink-0 select-none text-xs font-mono">
                        [{cue.start.toFixed(2)}s ➔ {cue.end.toFixed(2)}s]
                      </span>
                      <span className="text-zinc-100 font-sans font-medium">{cue.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="mt-5 flex justify-end gap-3">
            {!captions.length ? (
              !user && !isBYOK && provider !== 'local' ? (
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => signInWithGoogle()}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-base flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogIn className="w-5 h-5 text-zinc-950" />
                  <span>เข้าสู่ระบบด้วย Google เพื่อเริ่มถอดเสียงฟรี (3 คลิป/วัน)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isExtracting || isTranscribing}
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
                      <span>เริ่มถอดเสียงภาษาไทย (Start Transcription)</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => router.push('/editor')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>เข้าสู่หน้าแก้ไขซับไตเติล (Open Caption Editor)</span>
                <ArrowRight className="w-5 h-5" />
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
