import { StateCreator } from 'zustand';
import { AppState, ProviderMode, TranscriptionProvider, UserTier } from './types';
import { DEFAULT_THAI_DICTIONARY, DictionaryEntry } from '../default-dictionary';
import { fetchCustomDictionaryFromCloud } from '../supabase';

export function getUserTodayUsageKey(userId?: string): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return `subthaitle_usage_${userId || 'anon'}_${today}`;
}

export function getUserGoogleMonthKey(userId?: string): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `subthaitle_google_${userId || 'anon'}_${year}-${month}`;
}

export function getUserGroqDayKey(userId?: string): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `subthaitle_groq_${userId || 'anon'}_${year}-${month}-${day}`;
}

export function getDailyUsageFromStorage(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(getUserTodayUsageKey(userId));
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function getGoogleMonthlyUsageFromStorage(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(getUserGoogleMonthKey(userId));
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function getGroqDailyUsageFromStorage(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(getUserGroqDayKey(userId));
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function calculateCreditUsage(durationSeconds: number): number {
  const roundedSecs = Math.round(durationSeconds);
  if (roundedSecs <= 0) return 0;
  const fullMinutes = Math.floor(roundedSecs / 60);
  const remainingSeconds = roundedSecs % 60;

  if (fullMinutes === 0) {
    return 1;
  }

  if (remainingSeconds > 40) {
    return fullMinutes + 1;
  } else {
    return fullMinutes;
  }
}

export interface QuotaSlice {
  providerMode: ProviderMode;
  provider: TranscriptionProvider;
  tier: UserTier;
  groqApiKey: string;
  creditsMinutes: number;
  isLifetimeUnlocked: boolean;

  googleMonthlyUsageCount: number;
  maxGoogleMonthlyQuota: number;
  groqDailyUsageCount: number;
  maxGroqDailyQuota: number;

  dailyUsageCount: number;
  maxDailyFreeQuota: number;
  isAdmin: boolean;
  adminToken: string | null;

  customDictionary: DictionaryEntry[];

  setProviderMode: (mode: ProviderMode) => void;
  setProvider: (provider: TranscriptionProvider) => void;
  setTier: (tier: UserTier) => void;
  setGroqApiKey: (key: string) => void;
  addCredits: (minutes: number) => void;
  deductCredits: (minutes: number) => boolean;
  setCreditsMinutes: (minutes: number) => void;
  resetQuotas: (userId?: string) => void;
  setLifetimeUnlocked: (unlocked: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setAdminToken: (token: string | null) => void;
  setCustomDictionary: (entries: DictionaryEntry[]) => void;
  loadDictionary: () => Promise<void>;
  getDailyUsage: (userId?: string) => number;
  syncDailyUsage: (userId?: string) => void;
  incrementDailyUsage: (userId?: string) => void;
  syncQuotas: (userId?: string) => void;
  incrementGoogleMonthlyUsage: (userId?: string) => void;
  incrementGroqDailyUsage: (userId?: string) => void;
}

export const createQuotaSlice: StateCreator<AppState, [], [], QuotaSlice> = (set) => ({
  providerMode: 'free',
  provider: 'groq',
  tier: 'free',
  groqApiKey: '',
  creditsMinutes: 0,
  isLifetimeUnlocked: false,
  googleMonthlyUsageCount: 0,
  maxGoogleMonthlyQuota: 5,
  groqDailyUsageCount: 0,
  maxGroqDailyQuota: 3,
  dailyUsageCount: 0,
  maxDailyFreeQuota: 3,
  isAdmin: false,
  adminToken: null,

  customDictionary: DEFAULT_THAI_DICTIONARY,

  setProviderMode: (providerMode) => set({ providerMode }),
  setProvider: (provider) => set({ provider }),
  setTier: (tier) => set({ tier }),
  setGroqApiKey: (groqApiKey) => set({ groqApiKey }),

  addCredits: (minutes) =>
    set((state) => ({ creditsMinutes: Math.max(0, state.creditsMinutes + minutes) })),

  setCreditsMinutes: (creditsMinutes) =>
    set({ creditsMinutes: Math.max(0, creditsMinutes) }),

  deductCredits: (minutes) => {
    let success = false;
    set((state) => {
      if (state.creditsMinutes >= minutes) {
        success = true;
        return { creditsMinutes: state.creditsMinutes - minutes };
      }
      return state;
    });
    return success;
  },

  resetQuotas: (userId) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getUserGoogleMonthKey(userId));
        localStorage.removeItem(getUserGroqDayKey(userId));
        localStorage.removeItem(getUserTodayUsageKey(userId));
      } catch {}
    }
    set({
      googleMonthlyUsageCount: 0,
      groqDailyUsageCount: 0,
      dailyUsageCount: 0,
    });
  },

  setLifetimeUnlocked: (isLifetimeUnlocked) => set({ isLifetimeUnlocked }),
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

  getDailyUsage: (userId) => getDailyUsageFromStorage(userId),

  syncDailyUsage: (userId) => {
    const count = getDailyUsageFromStorage(userId);
    set({ dailyUsageCount: count });
  },

  incrementDailyUsage: (userId) => {
    const next = getDailyUsageFromStorage(userId) + 1;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getUserTodayUsageKey(userId), next.toString());
      } catch (e) {
        console.warn('Failed to save usage count to localStorage', e);
      }
    }
    set({ dailyUsageCount: next });
  },

  syncQuotas: (userId) => {
    const googleCount = getGoogleMonthlyUsageFromStorage(userId);
    const groqCount = getGroqDailyUsageFromStorage(userId);
    set({
      googleMonthlyUsageCount: googleCount,
      groqDailyUsageCount: groqCount,
    });
  },

  incrementGoogleMonthlyUsage: (userId) => {
    const next = getGoogleMonthlyUsageFromStorage(userId) + 1;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getUserGoogleMonthKey(userId), next.toString());
      } catch (e) {
        console.warn('Failed to save google monthly usage', e);
      }
    }
    set({ googleMonthlyUsageCount: next });
  },

  incrementGroqDailyUsage: (userId) => {
    const next = getGroqDailyUsageFromStorage(userId) + 1;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getUserGroqDayKey(userId), next.toString());
      } catch (e) {
        console.warn('Failed to save groq daily usage', e);
      }
    }
    set({ groqDailyUsageCount: next });
  },
});
