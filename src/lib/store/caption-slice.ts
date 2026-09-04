import { StateCreator } from 'zustand';
import { AppState, CaptionItem, CaptionStyle, CaptionWord, CaptionOverrideStyle } from './types';
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
  wordAnimationMode: 'classic',
  hasBackground: false,
  backgroundColor: '#000000',
  backgroundOpacity: 60,
  hasGlow: false,
  glowColor: '#FF6B00',
  glowBlur: 12,
};

interface HistorySnapshot {
  captions: CaptionItem[];
  style: CaptionStyle;
}

const MAX_HISTORY = 40;

function pushSnapshot(state: { captions: CaptionItem[]; style: CaptionStyle; undoStack?: HistorySnapshot[] }): { undoStack: HistorySnapshot[]; redoStack: HistorySnapshot[] } {
  const currentSnapshot: HistorySnapshot = {
    captions: JSON.parse(JSON.stringify(state.captions || [])),
    style: { ...state.style },
  };
  const prevStack = state.undoStack || [];
  return {
    undoStack: [...prevStack, currentSnapshot].slice(-MAX_HISTORY),
    redoStack: [],
  };
}

export interface CaptionSlice {
  rawWords: CaptionWord[];
  pacingMode: PacingMode;
  customMaxWords: number;
  captions: CaptionItem[];
  activeCaptionIndex: number | null;
  style: CaptionStyle;
  activePresetId: string;
  customPresets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>;

  // History (Undo / Redo)
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  undo: () => void;
  redo: () => void;

  setRawWords: (rawWords: CaptionWord[]) => void;
  setPacingMode: (pacingMode: PacingMode, customMaxWords?: number) => void;
  regroupCaptions: (overrideMode?: PacingMode, overrideCustomWords?: number) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  updateCaptionOverride: (id: string, override?: CaptionOverrideStyle | null) => void;
  addCaption: (afterId?: string) => void;
  deleteCaption: (id: string) => void;
  splitCaption: (id: string, splitWordIndex?: number) => void;
  mergeCaption: (id: string, direction: 'next' | 'prev') => void;
  moveCaption: (id: string, direction: 'up' | 'down') => void;
  autoAlignAllCaptions: () => void;
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
  undoStack: [],
  redoStack: [],

  undo: () =>
    set((state) => {
      if (!state.undoStack || state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      const currentSnapshot: HistorySnapshot = {
        captions: JSON.parse(JSON.stringify(state.captions || [])),
        style: { ...state.style },
      };
      const newRedoStack = [...(state.redoStack || []), currentSnapshot].slice(-MAX_HISTORY);

      return {
        captions: prev.captions,
        style: prev.style,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    }),

  redo: () =>
    set((state) => {
      if (!state.redoStack || state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);
      const currentSnapshot: HistorySnapshot = {
        captions: JSON.parse(JSON.stringify(state.captions || [])),
        style: { ...state.style },
      };
      const newUndoStack = [...(state.undoStack || []), currentSnapshot].slice(-MAX_HISTORY);

      return {
        captions: next.captions,
        style: next.style,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    }),

  setRawWords: (rawWords) => set({ rawWords }),

  setPacingMode: (pacingMode, customMaxWords) => {
    set((state) => {
      const history = pushSnapshot(state);
      const nextCustomWords = customMaxWords ?? state.customMaxWords;
      const newCaptions = groupWordsIntoCaptions(state.rawWords, {
        mode: pacingMode,
        ...(pacingMode === 'custom' ? { maxWordsPerLine: nextCustomWords } : {}),
      });
      return {
        ...history,
        pacingMode,
        customMaxWords: nextCustomWords,
        captions: newCaptions.length > 0 ? newCaptions : state.captions,
      };
    });
  },

  regroupCaptions: (overrideMode, overrideCustomWords) => {
    set((state) => {
      const history = pushSnapshot(state);
      const mode = overrideMode || state.pacingMode;
      const words = overrideCustomWords || state.customMaxWords;
      const newCaptions = groupWordsIntoCaptions(state.rawWords, {
        mode,
        ...(mode === 'custom' ? { maxWordsPerLine: words } : {}),
      });
      return {
        ...history,
        pacingMode: mode,
        customMaxWords: words,
        captions: newCaptions.length > 0 ? newCaptions : state.captions,
      };
    });
  },

  setCaptions: (captions) =>
    set((state) => ({
      ...pushSnapshot(state),
      captions,
    })),

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
    set((state) => {
      const index = state.captions.findIndex((c) => c.id === id);
      if (index === -1) return state;

      const history = pushSnapshot(state);
      const newCaptions = [...state.captions];
      const safeStart = Math.max(0, Number(start.toFixed(2)));
      let safeEnd = Math.max(safeStart + 0.1, Number(end.toFixed(2)));

      // 1. Check Previous Caption (No Overlap)
      if (index > 0) {
        const prev = newCaptions[index - 1];
        if (safeStart < prev.end) {
          // If start encroaches on previous card, shrink previous end to eliminate overlap
          if (safeStart >= prev.start + 0.1) {
            const updatedPrevEnd = Number(safeStart.toFixed(2));
            newCaptions[index - 1] = {
              ...prev,
              end: updatedPrevEnd,
              words: prev.text ? distributeTextToWords(prev.text, prev.start, updatedPrevEnd) : prev.words,
            };
          } else {
            // Cannot shrink previous below 0.1s duration, so clamp safeStart
            safeEnd = Math.max(prev.end + 0.1, safeEnd);
          }
        }
      }

      // 2. Check Next Caption (No Overlap)
      if (index < newCaptions.length - 1) {
        const next = newCaptions[index + 1];
        if (safeEnd > next.start) {
          // If end encroaches on next card, push next card's start
          if (next.end > safeEnd + 0.1) {
            const updatedNextStart = Number(safeEnd.toFixed(2));
            newCaptions[index + 1] = {
              ...next,
              start: updatedNextStart,
              words: next.text ? distributeTextToWords(next.text, updatedNextStart, next.end) : next.words,
            };
          } else {
            // Next card has no space, clamp current safeEnd to next.start
            safeEnd = Number(next.start.toFixed(2));
          }
        }
      }

      const curr = newCaptions[index];
      newCaptions[index] = {
        ...curr,
        start: safeStart,
        end: safeEnd,
        words: curr.text ? distributeTextToWords(curr.text, safeStart, safeEnd) : curr.words,
      };

      return {
        ...history,
        captions: newCaptions,
      };
    }),

  updateCaptionOverride: (id, override) =>
    set((state) => ({
      captions: state.captions.map((c) =>
        c.id === id
          ? {
              ...c,
              overrideStyle:
                override && Object.keys(override).length > 0 ? override : undefined,
            }
          : c
      ),
    })),

  moveCaption: (id, direction) =>
    set((state) => {
      const index = state.captions.findIndex((c) => c.id === id);
      if (index === -1) return state;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.captions.length) return state;

      const history = pushSnapshot(state);
      const newCaptions = [...state.captions];

      // Swap elements
      const firstIdx = Math.min(index, targetIndex);
      const secondIdx = Math.max(index, targetIndex);

      const cardA = newCaptions[firstIdx];
      const cardB = newCaptions[secondIdx];

      // Smart timestamp swap/alignment so order changes smoothly without collision
      const durA = Number((cardA.end - cardA.start).toFixed(2));
      const durB = Number((cardB.end - cardB.start).toFixed(2));
      const baseStart = cardA.start;

      const reorderedFirst = {
        ...cardB,
        start: baseStart,
        end: Number((baseStart + durB).toFixed(2)),
        words: cardB.text ? distributeTextToWords(cardB.text, baseStart, baseStart + durB) : cardB.words,
      };

      const reorderedSecond = {
        ...cardA,
        start: Number((baseStart + durB).toFixed(2)),
        end: Number((baseStart + durB + durA).toFixed(2)),
        words: cardA.text ? distributeTextToWords(cardA.text, baseStart + durB, baseStart + durB + durA) : cardA.words,
      };

      newCaptions[firstIdx] = reorderedFirst;
      newCaptions[secondIdx] = reorderedSecond;

      return {
        ...history,
        captions: newCaptions,
        activeCaptionIndex: targetIndex,
      };
    }),

  autoAlignAllCaptions: () =>
    set((state) => {
      if (state.captions.length <= 0) return state;
      const history = pushSnapshot(state);
      const aligned = [...state.captions];

      for (let i = 0; i < aligned.length; i++) {
        // 1. Fix overlap with previous
        if (i > 0) {
          const prev = aligned[i - 1];
          const curr = aligned[i];
          if (curr.start < prev.end) {
            const dur = Math.max(0.2, curr.end - curr.start);
            const newStart = Number(prev.end.toFixed(2));
            const newEnd = Number((newStart + dur).toFixed(2));
            aligned[i] = {
              ...curr,
              start: newStart,
              end: newEnd,
              words: curr.text ? distributeTextToWords(curr.text, newStart, newEnd) : curr.words,
            };
          }
        }

        // 2. Smart Gap Bridging & Hang Time Hold for current cue
        if (i < aligned.length - 1) {
          const curr = aligned[i];
          const next = aligned[i + 1];
          const gap = next.start - curr.end;
          const currDur = curr.end - curr.start;

          // Only extend if current duration is reasonable (< 5.0s)
          if (gap > 0.05 && currDur < 5.0) {
            let newEnd = curr.end;

            if (gap <= 1.25) {
              // Short-to-medium gap (<= 1.25s): bridge gap directly to eliminate flickering
              newEnd = Number((next.start - 0.05).toFixed(2));
            } else if (gap <= 2.5) {
              // Medium gap (1.25s - 2.5s): add 0.80s reading hold time, leave 0.5s pause before next
              newEnd = Number(Math.min(next.start - 0.5, curr.end + 0.85).toFixed(2));
            }

            if (newEnd > curr.end) {
              aligned[i] = {
                ...curr,
                end: newEnd,
                words: curr.text ? distributeTextToWords(curr.text, curr.start, newEnd) : curr.words,
              };
            }
          }
        }
      }

      return {
        ...history,
        captions: aligned,
      };
    }),

  addCaption: (afterId) =>
    set((state) => {
      const history = pushSnapshot(state);
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

      return {
        ...history,
        captions: newCaptions,
      };
    }),

  deleteCaption: (id) =>
    set((state) => ({
      ...pushSnapshot(state),
      captions: state.captions.filter((c) => c.id !== id),
    })),

  splitCaption: (id, splitWordIndex) =>
    set((state) => {
      const index = state.captions.findIndex((c) => c.id === id);
      if (index === -1) return state;
      const history = pushSnapshot(state);

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
      return {
        ...history,
        captions: newCaptions,
      };
    }),

  mergeCaption: (id, direction) =>
    set((state) => {
      const index = state.captions.findIndex((c) => c.id === id);
      if (index === -1) return state;

      const targetIndex = direction === 'next' ? index + 1 : index - 1;
      if (targetIndex < 0 || targetIndex >= state.captions.length) return state;

      const history = pushSnapshot(state);
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
      return {
        ...history,
        captions: newCaptions,
      };
    }),

  shiftAllCaptions: (offsetSeconds) =>
    set((state) => ({
      ...pushSnapshot(state),
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
      const history = pushSnapshot(state);
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      return {
        ...history,
        captions: state.captions.map((c) => ({
          ...c,
          text: c.text.replace(regex, replaceText),
        })),
      };
    }),

  setActiveCaptionIndex: (activeCaptionIndex) => set({ activeCaptionIndex }),

  setStyle: (stylePartial) =>
    set((state) => ({
      ...pushSnapshot(state),
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
