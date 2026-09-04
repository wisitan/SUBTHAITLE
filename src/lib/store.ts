import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AppState } from './store/types';
import { createCaptionSlice, defaultCaptionStyle } from './store/caption-slice';
import { createQuotaSlice, getUserGoogleMonthKey, getUserGroqDayKey, getUserTodayUsageKey, getDailyUsageFromStorage, getGoogleMonthlyUsageFromStorage, getGroqDailyUsageFromStorage, calculateCreditUsage } from './store/quota-slice';
import { createMediaSlice } from './store/media-slice';

export * from './store/types';
export {
  defaultCaptionStyle,
  getUserGoogleMonthKey,
  getUserGroqDayKey,
  getUserTodayUsageKey,
  getDailyUsageFromStorage,
  getGoogleMonthlyUsageFromStorage,
  getGroqDailyUsageFromStorage,
  calculateCreditUsage,
};

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createMediaSlice(...a),
      ...createQuotaSlice(...a),
      ...createCaptionSlice(...a),
    }),
    {
      name: 'subthaitle_user_settings',
      partialize: (state) => ({
        providerMode: state.providerMode,
        provider: state.provider,
        tier: state.tier,
        groqApiKey: state.groqApiKey,
        style: state.style,
        activePresetId: state.activePresetId,
        customPresets: state.customPresets,
        transcriptionMeta: state.transcriptionMeta,
      }),
    }
  )
);
