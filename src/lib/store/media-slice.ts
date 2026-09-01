import { StateCreator } from 'zustand';
import { AppState } from './types';

export interface MediaSlice {
  file: File | null;
  videoUrl: string | null;
  audioBlob: Blob | null;
  mediaDuration: number;

  status: 'idle' | 'extracting_audio' | 'uploading' | 'transcribing' | 'ready' | 'error';
  progress: number;
  statusMessage: string;
  errorMessage: string | null;

  aspectRatio: '9:16' | '16:9' | '1:1';
  showTikTokSafeZone: boolean;
  seekTarget: { time: number; autoPlay?: boolean; timestamp: number } | null;
  currentTime: number;

  setFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setMediaDuration: (duration: number) => void;
  setStatus: (status: AppState['status'], progress?: number, message?: string) => void;
  setErrorMessage: (msg: string | null) => void;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  setShowTikTokSafeZone: (show: boolean) => void;
  requestSeek: (time: number, autoPlay?: boolean) => void;
  setCurrentTime: (time: number) => void;
  reset: () => void;
}

export const createMediaSlice: StateCreator<AppState, [], [], MediaSlice> = (set) => ({
  file: null,
  videoUrl: null,
  audioBlob: null,
  mediaDuration: 0,

  status: 'idle',
  progress: 0,
  statusMessage: '',
  errorMessage: null,

  aspectRatio: '9:16',
  showTikTokSafeZone: false,
  seekTarget: null,
  currentTime: 0,

  setFile: (file) => set({ file }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setAudioBlob: (audioBlob) => set({ audioBlob }),
  setMediaDuration: (mediaDuration) => set({ mediaDuration }),

  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setShowTikTokSafeZone: (showTikTokSafeZone) => set({ showTikTokSafeZone }),
  requestSeek: (time, autoPlay = false) =>
    set({
      seekTarget: { time, autoPlay, timestamp: Date.now() },
      currentTime: time,
    }),

  setStatus: (status, progress = 0, statusMessage = '') =>
    set({ status, progress, statusMessage }),

  setErrorMessage: (errorMessage) =>
    set({ errorMessage, status: errorMessage ? 'error' : 'idle' }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  reset: () =>
    set({
      file: null,
      videoUrl: null,
      audioBlob: null,
      mediaDuration: 0,
      status: 'idle',
      progress: 0,
      statusMessage: '',
      errorMessage: null,
      rawWords: [],
      captions: [],
      activeCaptionIndex: null,
      currentTime: 0,
    }),
});
