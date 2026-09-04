import { StateCreator } from 'zustand';
import { AppState, UserProject } from './types';

export interface MediaSlice {
  file: File | null;
  videoUrl: string | null;
  proxyUrl: string | null;
  originalFilename: string | null;
  audioBlob: Blob | null;
  mediaDuration: number;

  currentProjectId: string | null;
  projectTitle: string;

  status: 'idle' | 'extracting_audio' | 'uploading' | 'transcribing' | 'ready' | 'error';
  progress: number;
  statusMessage: string;
  errorMessage: string | null;
  transcriptionMeta: AppState['transcriptionMeta'];

  aspectRatio: '9:16' | '16:9' | '1:1';
  showTikTokSafeZone: boolean;
  seekTarget: { time: number; autoPlay?: boolean; timestamp: number } | null;
  currentTime: number;

  setFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setProxyUrl: (proxyUrl: string | null) => void;
  setOriginalFilename: (filename: string | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setMediaDuration: (duration: number) => void;
  setCurrentProjectId: (id: string | null) => void;
  setProjectTitle: (title: string) => void;
  loadProject: (project: UserProject) => void;
  setStatus: (status: AppState['status'], progress?: number, message?: string) => void;
  setErrorMessage: (msg: string | null) => void;
  setTranscriptionMeta: (meta: AppState['transcriptionMeta']) => void;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  setShowTikTokSafeZone: (show: boolean) => void;
  requestSeek: (time: number, autoPlay?: boolean) => void;
  setCurrentTime: (time: number) => void;
  reset: () => void;
}

export const createMediaSlice: StateCreator<AppState, [], [], MediaSlice> = (set) => ({
  file: null,
  videoUrl: null,
  proxyUrl: null,
  originalFilename: null,
  audioBlob: null,
  mediaDuration: 0,

  currentProjectId: null,
  projectTitle: '',

  status: 'idle',
  progress: 0,
  statusMessage: '',
  errorMessage: null,
  transcriptionMeta: null,

  aspectRatio: '9:16',
  showTikTokSafeZone: false,
  seekTarget: null,
  currentTime: 0,

  setFile: (file) => set({ file, originalFilename: file ? file.name : null }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setProxyUrl: (proxyUrl) => set({ proxyUrl }),
  setOriginalFilename: (originalFilename) => set({ originalFilename }),
  setAudioBlob: (audioBlob) => set({ audioBlob }),
  setMediaDuration: (mediaDuration) => set({ mediaDuration }),

  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),
  setProjectTitle: (projectTitle) => set({ projectTitle }),

  loadProject: (project) => {
    set((state) => ({
      currentProjectId: project.id,
      projectTitle: project.title,
      proxyUrl: project.proxy_url || null,
      originalFilename: project.original_filename || project.title || null,
      mediaDuration: project.duration || 0,
      captions: project.captions || [],
      rawWords: project.raw_words || [],
      style: project.style ? { ...state.style, ...project.style } : state.style,
      aspectRatio: project.aspect_ratio || '9:16',
      status: 'ready',
      currentTime: 0,
      activeCaptionIndex: null,
      transcriptionMeta: null,
    }));
  },

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

  setTranscriptionMeta: (transcriptionMeta) => set({ transcriptionMeta }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  reset: () =>
    set({
      file: null,
      videoUrl: null,
      proxyUrl: null,
      originalFilename: null,
      audioBlob: null,
      mediaDuration: 0,
      currentProjectId: null,
      projectTitle: '',
      status: 'idle',
      progress: 0,
      statusMessage: '',
      errorMessage: null,
      transcriptionMeta: null,
      rawWords: [],
      captions: [],
      activeCaptionIndex: null,
      currentTime: 0,
    }),
});
