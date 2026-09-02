import { PacingMode } from '../caption-grouping';
import { DictionaryEntry } from '../default-dictionary';

export type TranscriptionProvider = 'groq' | 'elevenlabs' | 'local';
export type UserTier = 'free' | 'tier_99' | 'tier_299';
export type ProviderMode = 'free' | 'credits' | 'google_free' | 'groq_free' | 'byok' | 'local';

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

export type WordAnimationMode = 'classic' | 'pop' | 'sticker' | 'typewriter';

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
  wordAnimationMode?: WordAnimationMode; // 'classic' (ทั้งประโยค) | 'pop' (เด้งทีละคำ) | 'sticker' (สติกเกอร์กล่องข้อความ)
  hasBackground?: boolean;
  backgroundColor?: string;     // Hex color e.g. "#000000"
  backgroundOpacity?: number;   // 0 to 100 (percentage)
}

export interface UserProject {
  id: string;
  user_id: string;
  title: string;
  duration: number;
  thumbnail_url?: string | null;
  proxy_url?: string | null;
  original_filename?: string | null;
  captions: CaptionItem[];
  raw_words?: CaptionWord[];
  style?: CaptionStyle;
  aspect_ratio?: '9:16' | '16:9' | '1:1';
  created_at?: string;
  updated_at?: string;
}

export interface AppState {
  // File & Media state
  file: File | null;
  videoUrl: string | null;
  proxyUrl: string | null;
  originalFilename: string | null;
  audioBlob: Blob | null;
  mediaDuration: number;
  
  // Projects & Cloud Drafts
  currentProjectId: string | null;
  projectTitle: string;
  
  // Processing state
  status: 'idle' | 'extracting_audio' | 'uploading' | 'transcribing' | 'ready' | 'error';
  progress: number; // 0 to 100
  statusMessage: string;
  errorMessage: string | null;
  
  // Settings, Quotas & Credits Model
  providerMode: ProviderMode;
  provider: TranscriptionProvider;
  tier: UserTier;
  groqApiKey: string;
  creditsMinutes: number;
  isLifetimeUnlocked: boolean;
  
  googleMonthlyUsageCount: number;
  maxGoogleMonthlyQuota: number; // 5 clips / month
  groqDailyUsageCount: number;
  maxGroqDailyQuota: number;     // 5 clips / day
  
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
  showTikTokSafeZone: boolean;
  seekTarget: { time: number; autoPlay?: boolean; timestamp: number } | null;
  
  // Actions
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
  setProviderMode: (mode: ProviderMode) => void;
  setProvider: (provider: TranscriptionProvider) => void;
  setTier: (tier: UserTier) => void;
  setGroqApiKey: (key: string) => void;
  addCredits: (minutes: number) => void;
  deductCredits: (minutes: number) => boolean;
  setLifetimeUnlocked: (unlocked: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setAdminToken: (token: string | null) => void;
  setCustomDictionary: (entries: DictionaryEntry[]) => void;
  loadDictionary: () => Promise<void>;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  setShowTikTokSafeZone: (show: boolean) => void;
  requestSeek: (time: number, autoPlay?: boolean) => void;
  setRawWords: (words: CaptionWord[]) => void;
  setPacingMode: (mode: PacingMode, customWords?: number) => void;
  regroupCaptions: (mode?: PacingMode, customWords?: number) => void;
  setCreditsMinutes: (minutes: number) => void;
  resetQuotas: (userId?: string) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  addCaption: (afterId?: string) => void;
  deleteCaption: (id: string) => void;
  splitCaption: (id: string, splitWordIndex?: number) => void;
  mergeCaption: (id: string, direction: 'next' | 'prev') => void;
  shiftAllCaptions: (offsetSeconds: number) => void;
  findAndReplace: (findText: string, replaceText: string, caseSensitive?: boolean) => void;
  // History (Undo / Redo)
  undoStack: Array<{ captions: CaptionItem[]; style: CaptionStyle }>;
  redoStack: Array<{ captions: CaptionItem[]; style: CaptionStyle }>;
  undo: () => void;
  redo: () => void;

  setActiveCaptionIndex: (index: number | null) => void;
  setCurrentTime: (time: number) => void;
  setStyle: (stylePartial: Partial<CaptionStyle>) => void;
  setActivePresetId: (id: string) => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  setCustomPresets: (presets: Array<{ id: string; name: string; style: CaptionStyle; createdAt: string }>) => void;
  getDailyUsage: (userId?: string) => number;
  syncQuotas: (userId?: string) => void;
  syncQuotasWithProfile: (
    profile: {
      groq_free_day?: string | null;
      groq_free_count?: number;
      google_free_month?: string | null;
      google_free_count?: number;
    } | null,
    userId?: string
  ) => void;
  setGroqDailyUsageCount: (count: number, userId?: string) => void;
  incrementGoogleMonthlyUsage: (userId?: string) => void;
  incrementGroqDailyUsage: (userId?: string) => void;
  reset: () => void;
}
