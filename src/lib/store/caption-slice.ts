import { StateCreator } from 'zustand';
import { AppState, CaptionItem, CaptionStyle, CaptionWord } from './types';
import { groupWordsIntoCaptions, PacingMode } from '../caption-grouping';
import { distributeTextToWords } from '../thai-text';

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Noto Sans Thai',
  fontSize: 20,
  textColor: '#FFFFFF',
  fontWeight: 'bold',
  letterSpacing: 0,
  lineHeight: 1.4,
  positionY: 28,
  positionX: 50,
  textAlign: 'center',
  maxWidth: 78,
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

export interface CaptionSlice {
  rawWords: CaptionWord[];
  pacingMode: PacingMode;
  customMaxWords: number;
  captions: CaptionItem[];
  activeCaptionIndex: number | null;
  style: CaptionStyle;
  activePresetId: string;
  customPresets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>;

  setRawWords: (rawWords: CaptionWord[]) => void;
  setPacingMode: (pacingMode: PacingMode, customMaxWords?: number) => void;
  regroupCaptions: (overrideMode?: PacingMode, overrideCustomWords?: number) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  addCaption: (afterId?: string) => void;
  deleteCaption: (id: string) => void;
  splitCaption: (id: string, splitWordIndex?: number) => void;
  mergeCaption: (id: string, direction: 'next' | 'prev') => void;
  shiftAllCaptions: (offsetSeconds: number) => void;
  findAndReplace: (findText: string, replaceText: string, caseSensitive?: boolean) => void;
  setActiveCaptionIndex: (activeCaptionIndex: number | null) => void;
  setStyle: (stylePartial: Partial<CaptionStyle>) => void;
  setActivePresetId: (activePresetId: string) => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  setCustomPresets: (customPresets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>) => void;
}

export const createCaptionSlice: StateCreator<AppState, [], [], CaptionSlice> = (set) => ({
  rawWords: [],
  pacingMode: 'medium',
  customMaxWords: 8,
  captions: [],
  activeCaptionIndex: null,
  style: defaultCaptionStyle,
  activePresetId: 'tiktok-viral',
  customPresets: [],

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
});
