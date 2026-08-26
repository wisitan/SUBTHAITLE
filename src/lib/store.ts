import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PacingMode, groupWordsIntoCaptions } from './caption-grouping';
import { DictionaryEntry, DEFAULT_THAI_DICTIONARY } from './default-dictionary';
import { fetchCustomDictionaryFromCloud } from './supabase';

export type TranscriptionProvider = 'groq' | 'elevenlabs' | 'local';
export type UserTier = 'free' | 'coffee' | 'meal';

export interface CaptionWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  confidence?: number;
}

export interface CaptionItem {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words?: CaptionWord[];
  lowConfidence?: boolean;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number; // in px or vw
  textColor: string;
  fontWeight: string;
  positionY: number; // percentage from bottom e.g. 15%
  positionX: number; // percentage from left e.g. 50%
  hasShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  hasOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  enableWordHighlight: boolean;
  highlightColor: string;
  backgroundColor?: string;
  hasBackground?: boolean;
}

export interface AppState {
  // File & Media state
  file: File | null;
  videoUrl: string | null;
  audioBlob: Blob | null;
  mediaDuration: number;
  
  // Processing state
  status: 'idle' | 'extracting_audio' | 'uploading' | 'transcribing' | 'ready' | 'error';
  progress: number; // 0 to 100
  statusMessage: string;
  errorMessage: string | null;
  
  // Settings & Tier
  provider: TranscriptionProvider;
  tier: UserTier;
  groqApiKey: string;
  dailyUsageCount: number;
  maxDailyFreeQuota: number;
  isAdmin: boolean;
  
  // Dictionary & Vocab
  customDictionary: DictionaryEntry[];
  
  // Captions & Pacing
  rawWords: CaptionWord[];
  pacingMode: PacingMode;
  customMaxWords: number;
  captions: CaptionItem[];
  activeCaptionIndex: number | null;
  currentTime: number;
  style: CaptionStyle;
  activePresetId: string;
  
  // Actions
  setFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setMediaDuration: (duration: number) => void;
  setStatus: (status: AppState['status'], progress?: number, message?: string) => void;
  setErrorMessage: (msg: string | null) => void;
  setProvider: (provider: TranscriptionProvider) => void;
  setTier: (tier: UserTier) => void;
  setGroqApiKey: (key: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setCustomDictionary: (entries: DictionaryEntry[]) => void;
  loadDictionary: () => Promise<void>;
  incrementDailyUsage: () => void;
  setRawWords: (words: CaptionWord[]) => void;
  setPacingMode: (mode: PacingMode, customWords?: number) => void;
  regroupCaptions: (mode?: PacingMode, customWords?: number) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  setActiveCaptionIndex: (index: number | null) => void;
  setCurrentTime: (time: number) => void;
  setStyle: (stylePartial: Partial<CaptionStyle>) => void;
  setActivePresetId: (id: string) => void;
  reset: () => void;
}

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Noto Sans Thai',
  fontSize: 28,
  textColor: '#FFFFFF',
  fontWeight: '700',
  positionY: 15,
  positionX: 50,
  hasShadow: true,
  shadowColor: '#000000',
  shadowBlur: 8,
  shadowOpacity: 0.8,
  hasOutline: true,
  outlineColor: '#000000',
  outlineWidth: 3,
  enableWordHighlight: true,
  highlightColor: '#FACC15', // Neon Yellow
  hasBackground: false,
  backgroundColor: 'rgba(0,0,0,0.6)',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      file: null,
      videoUrl: null,
      audioBlob: null,
      mediaDuration: 0,
      
      status: 'idle',
      progress: 0,
      statusMessage: '',
      errorMessage: null,
      
      provider: 'groq',
      tier: 'free',
      groqApiKey: '',
      dailyUsageCount: 0,
      maxDailyFreeQuota: 5,
      isAdmin: false,
      
      customDictionary: DEFAULT_THAI_DICTIONARY,
      
      rawWords: [],
      pacingMode: 'medium',
      customMaxWords: 8,
      captions: [],
      activeCaptionIndex: null,
      currentTime: 0,
      style: defaultCaptionStyle,
      activePresetId: 'default-thai-glow',
      
      setFile: (file) => set({ file }),
      setVideoUrl: (videoUrl) => set({ videoUrl }),
      setAudioBlob: (audioBlob) => set({ audioBlob }),
      setMediaDuration: (mediaDuration) => set({ mediaDuration }),
      
      setStatus: (status, progress = 0, statusMessage = '') =>
        set({ status, progress, statusMessage }),
        
      setErrorMessage: (errorMessage) => set({ errorMessage, status: errorMessage ? 'error' : 'idle' }),
      
      setProvider: (provider) => set({ provider }),
      setTier: (tier) => set({ tier }),
      setGroqApiKey: (groqApiKey) => set({ groqApiKey }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setCustomDictionary: (customDictionary) => set({ customDictionary }),
      
      loadDictionary: async () => {
        try {
          const res = await fetchCustomDictionaryFromCloud();
          if (res.data && res.data.length > 0) {
            set({ customDictionary: res.data });
          }
        } catch (err) {
          console.warn('Could not load custom dictionary from Supabase, using defaults:', err);
        }
      },
      
      incrementDailyUsage: () =>
        set((state) => ({ dailyUsageCount: state.dailyUsageCount + 1 })),
        
      setRawWords: (rawWords) => set({ rawWords }),
      
      setPacingMode: (pacingMode, customMaxWords) => {
        set((state) => {
          const nextCustomWords = customMaxWords ?? state.customMaxWords;
          const newCaptions = groupWordsIntoCaptions(state.rawWords, {
            mode: pacingMode,
            ...(pacingMode === 'custom' ? { maxWordsPerLine: nextCustomWords } : {}),
          });
          return {
            pacingMode,
            customMaxWords: nextCustomWords,
            captions: newCaptions.length > 0 ? newCaptions : state.captions,
          };
        });
      },
      
      regroupCaptions: (overrideMode, overrideCustomWords) => {
        set((state) => {
          const mode = overrideMode || state.pacingMode;
          const words = overrideCustomWords || state.customMaxWords;
          const newCaptions = groupWordsIntoCaptions(state.rawWords, {
            mode,
            ...(mode === 'custom' ? { maxWordsPerLine: words } : {}),
          });
          return {
            pacingMode: mode,
            customMaxWords: words,
            captions: newCaptions.length > 0 ? newCaptions : state.captions,
          };
        });
      },
      
      setCaptions: (captions) => set({ captions }),
      
      updateCaptionText: (id, text) =>
        set((state) => ({
          captions: state.captions.map((c) => (c.id === id ? { ...c, text } : c)),
        })),
        
      updateCaptionTiming: (id, start, end) =>
        set((state) => ({
          captions: state.captions.map((c) =>
            c.id === id ? { ...c, start, end } : c
          ),
        })),
        
      setActiveCaptionIndex: (activeCaptionIndex) => set({ activeCaptionIndex }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      
      setStyle: (stylePartial) =>
        set((state) => ({
          style: { ...state.style, ...stylePartial },
        })),
        
      setActivePresetId: (activePresetId) => set({ activePresetId }),
      
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
    }),
    {
      name: 'subthaitle_user_settings',
      partialize: (state) => ({
        provider: state.provider,
        tier: state.tier,
        groqApiKey: state.groqApiKey,
        dailyUsageCount: state.dailyUsageCount,
        isAdmin: state.isAdmin,
        style: state.style,
        activePresetId: state.activePresetId,
      }),
    }
  )
);
