import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PacingMode, groupWordsIntoCaptions } from './caption-grouping';
import { DictionaryEntry, DEFAULT_THAI_DICTIONARY } from './default-dictionary';
import { fetchCustomDictionaryFromCloud } from './supabase';
import { distributeTextToWords } from './thai-text';

export type TranscriptionProvider = 'groq' | 'elevenlabs' | 'local';
export type UserTier = 'free' | 'tier_99' | 'tier_299';

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
  originalText?: string; // Original AI transcription text for manual edit detection
  words?: CaptionWord[];
  lowConfidence?: boolean;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number; // in px or vw
  textColor: string;
  fontWeight: string;
  letterSpacing?: number; // in px e.g. -2 to 10px (default: 0)
  lineHeight?: number;    // line-height multiplier e.g. 1.0 to 2.4 (default: 1.4)
  positionY: number; // percentage from bottom e.g. 15%
  positionX: number; // percentage from left e.g. 50%
  textAlign?: 'left' | 'center' | 'right'; // text alignment (default: 'center')
  maxWidth?: number; // max-width percentage of video container e.g. 60 to 98% (default: 90%)
  hasShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  hasOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  enableWordHighlight: boolean;
  highlightColor: string;
  highlightScale?: number; // scale multiplier for active word, e.g. 1.15 (115%)
  hasBackground?: boolean;
  backgroundColor?: string;     // Hex color e.g. "#000000"
  backgroundOpacity?: number;   // 0 to 100 (percentage)
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
  adminToken: string | null;
  
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
  customPresets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>;
  
  // Player Settings
  aspectRatio: '9:16' | '16:9' | '1:1';
  
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
  setAdminToken: (token: string | null) => void;
  setCustomDictionary: (entries: DictionaryEntry[]) => void;
  loadDictionary: () => Promise<void>;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  incrementDailyUsage: () => void;
  setRawWords: (words: CaptionWord[]) => void;
  setPacingMode: (mode: PacingMode, customWords?: number) => void;
  regroupCaptions: (mode?: PacingMode, customWords?: number) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  addCaption: (afterId?: string) => void;
  deleteCaption: (id: string) => void;
  splitCaption: (id: string, splitWordIndex?: number) => void;
  mergeCaption: (id: string, direction: 'next' | 'prev') => void;
  shiftAllCaptions: (offsetSeconds: number) => void;
  findAndReplace: (findText: string, replaceText: string, caseSensitive?: boolean) => void;
  setActiveCaptionIndex: (index: number | null) => void;
  setCurrentTime: (time: number) => void;
  setStyle: (stylePartial: Partial<CaptionStyle>) => void;
  setActivePresetId: (id: string) => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  setCustomPresets: (presets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>) => void;
  reset: () => void;
}

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Noto Sans Thai',
  fontSize: 20,
  textColor: '#FFFFFF',
  fontWeight: 'bold',
  letterSpacing: 0,
  lineHeight: 1.4,
  positionY: 15,
  positionX: 50,
  textAlign: 'center',
  maxWidth: 70,
  hasShadow: true,
  shadowColor: '#000000',
  shadowBlur: 8,
  shadowOpacity: 0.8,
  hasOutline: true,
  outlineColor: '#000000',
  outlineWidth: 1,
  enableWordHighlight: true,
  highlightColor: '#FACC15',
  highlightScale: 1.15,
  hasBackground: false,
  backgroundColor: '#000000',
  backgroundOpacity: 60,
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
      maxDailyFreeQuota: 3,
      isAdmin: false,
      adminToken: null,
      
      customDictionary: DEFAULT_THAI_DICTIONARY,
      
      rawWords: [],
      pacingMode: 'medium',
      customMaxWords: 8,
      captions: [],
      activeCaptionIndex: null,
      currentTime: 0,
      style: defaultCaptionStyle,
      activePresetId: 'tiktok-viral',
      customPresets: [],
      
      aspectRatio: '9:16',
      
      setFile: (file) => set({ file }),
      setVideoUrl: (videoUrl) => set({ videoUrl }),
      setAudioBlob: (audioBlob) => set({ audioBlob }),
      setMediaDuration: (mediaDuration) => set({ mediaDuration }),
      
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      
      setStatus: (status, progress = 0, statusMessage = '') =>
        set({ status, progress, statusMessage }),
        
      setErrorMessage: (errorMessage) => set({ errorMessage, status: errorMessage ? 'error' : 'idle' }),
      
      setProvider: (provider) => set({ provider }),
      setTier: (tier) => set({ tier }),
      setGroqApiKey: (groqApiKey) => set({ groqApiKey }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setAdminToken: (adminToken) => set({ adminToken }),
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
          captions: state.captions.map((c) => {
            if (c.id === id) {
              const newWords = distributeTextToWords(text, c.start, c.end);
              return { ...c, text, words: newWords };
            }
            return c;
          }),
        })),
        
      updateCaptionTiming: (id, start, end) =>
        set((state) => ({
          captions: state.captions.map((c) => {
            if (c.id === id) {
              // If timing changes, regenerate proportional words timing
              const newWords = c.text ? distributeTextToWords(c.text, start, end) : c.words;
              return { ...c, start, end, words: newWords };
            }
            return c;
          }),
        })),

      addCaption: (afterId) =>
        set((state) => {
          const index = afterId
            ? state.captions.findIndex((c) => c.id === afterId)
            : state.captions.length - 1;

          let start = 0;
          let end = 2.0;

          if (index >= 0 && state.captions[index]) {
            const prev = state.captions[index];
            start = Number((prev.end + 0.05).toFixed(3));
            end = Number((start + 2.0).toFixed(3));
          } else if (state.captions.length > 0) {
            const last = state.captions[state.captions.length - 1];
            start = Number((last.end + 0.05).toFixed(3));
            end = Number((start + 2.0).toFixed(3));
          }

          const newCue: CaptionItem = {
            id: `cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            start,
            end,
            text: 'ข้อความซับใหม่',
            originalText: 'ข้อความซับใหม่',
          };

          const newCaptions = [...state.captions];
          if (index >= 0) {
            newCaptions.splice(index + 1, 0, newCue);
          } else {
            newCaptions.push(newCue);
          }

          return { captions: newCaptions };
        }),

      deleteCaption: (id) =>
        set((state) => ({
          captions: state.captions.filter((c) => c.id !== id),
        })),

      splitCaption: (id, splitWordIndex) =>
        set((state) => {
          const index = state.captions.findIndex((c) => c.id === id);
          if (index === -1) return state;

          const cue = state.captions[index];
          let cue1: CaptionItem;
          let cue2: CaptionItem;

          if (cue.words && cue.words.length > 1) {
            const splitIdx = splitWordIndex !== undefined
              ? Math.max(1, Math.min(cue.words.length - 1, splitWordIndex))
              : Math.ceil(cue.words.length / 2);

            const words1 = cue.words.slice(0, splitIdx);
            const words2 = cue.words.slice(splitIdx);

            cue1 = {
              id: `${cue.id}-1`,
              start: words1[0].start,
              end: words1[words1.length - 1].end,
              text: words1.map((w) => w.word).join('').trim(),
              originalText: words1.map((w) => w.word).join('').trim(),
              words: words1,
            };

            cue2 = {
              id: `cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              start: words2[0].start,
              end: words2[words2.length - 1].end,
              text: words2.map((w) => w.word).join('').trim(),
              originalText: words2.map((w) => w.word).join('').trim(),
              words: words2,
            };
          } else {
            // Text-based fallback split
            const words = cue.text.trim().split(/\s+/);
            const midTime = Number(((cue.start + cue.end) / 2).toFixed(3));

            let text1 = cue.text;
            let text2 = '...';

            if (words.length > 1) {
              const midWord = Math.ceil(words.length / 2);
              text1 = words.slice(0, midWord).join(' ');
              text2 = words.slice(midWord).join(' ');
            } else {
              const midChar = Math.ceil(cue.text.length / 2);
              text1 = cue.text.slice(0, midChar);
              text2 = cue.text.slice(midChar);
            }

            cue1 = {
              id: `${cue.id}-1`,
              start: cue.start,
              end: midTime,
              text: text1,
              originalText: text1,
              words: distributeTextToWords(text1, cue.start, midTime),
            };

            cue2 = {
              id: `cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              start: midTime,
              end: cue.end,
              text: text2,
              originalText: text2,
              words: distributeTextToWords(text2, midTime, cue.end),
            };
          }

          const newCaptions = [...state.captions];
          newCaptions.splice(index, 1, cue1, cue2);
          return { captions: newCaptions };
        }),

      mergeCaption: (id, direction) =>
        set((state) => {
          const index = state.captions.findIndex((c) => c.id === id);
          if (index === -1) return state;

          const targetIndex = direction === 'next' ? index + 1 : index - 1;
          if (targetIndex < 0 || targetIndex >= state.captions.length) return state;

          const firstIndex = Math.min(index, targetIndex);
          const secondIndex = Math.max(index, targetIndex);

          const cueA = state.captions[firstIndex];
          const cueB = state.captions[secondIndex];

          const mergedWords =
            cueA.words && cueB.words 
              ? [...cueA.words, ...cueB.words] 
              : distributeTextToWords(`${cueA.text} ${cueB.text}`.trim(), cueA.start, cueB.end);

          const mergedCue: CaptionItem = {
            id: cueA.id,
            start: cueA.start,
            end: cueB.end,
            text: `${cueA.text} ${cueB.text}`.trim(),
            originalText: `${cueA.originalText || cueA.text} ${cueB.originalText || cueB.text}`.trim(),
            words: mergedWords,
          };

          const newCaptions = [...state.captions];
          newCaptions.splice(firstIndex, 2, mergedCue);
          return { captions: newCaptions };
        }),

      shiftAllCaptions: (offsetSeconds) =>
        set((state) => ({
          captions: state.captions.map((c) => ({
            ...c,
            start: Math.max(0, Number((c.start + offsetSeconds).toFixed(3))),
            end: Math.max(0.1, Number((c.end + offsetSeconds).toFixed(3))),
            words: c.words?.map((w) => ({
              ...w,
              start: Math.max(0, Number((w.start + offsetSeconds).toFixed(3))),
              end: Math.max(0.1, Number((w.end + offsetSeconds).toFixed(3))),
            })),
          })),
        })),

      findAndReplace: (findText, replaceText, caseSensitive = false) =>
        set((state) => {
          if (!findText) return state;
          const flags = caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

          return {
            captions: state.captions.map((c) => ({
              ...c,
              text: c.text.replace(regex, replaceText),
            })),
          };
        }),

      setActiveCaptionIndex: (activeCaptionIndex) => set({ activeCaptionIndex }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      
      setStyle: (stylePartial) =>
        set((state) => ({
          style: { ...state.style, ...stylePartial },
        })),
        
      setActivePresetId: (activePresetId) => set({ activePresetId }),

      saveCustomPreset: (name) =>
        set((state) => {
          const newPreset = {
            id: `custom-${Date.now().toString(36)}`,
            name: name.trim() || `สไตล์ของฉัน ${state.customPresets.length + 1}`,
            style: { ...state.style },
            createdAt: new Date().toISOString(),
          };
          return {
            customPresets: [newPreset, ...state.customPresets],
            activePresetId: newPreset.id,
          };
        }),

      deleteCustomPreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
        })),

      setCustomPresets: (customPresets) => set({ customPresets }),
      
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
        customPresets: state.customPresets,
      }),
    }
  )
);
