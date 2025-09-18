import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { browser } from 'wxt/browser';

export type SupportedLanguage = 'ko' | 'en';

interface LanguageState {
  selectedLanguage: SupportedLanguage | null;
  setLanguage: (language: SupportedLanguage | null) => void;
  getCurrentLanguage: () => SupportedLanguage;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      selectedLanguage: null,

      setLanguage: (language: SupportedLanguage | null) => {
        set({ selectedLanguage: language });
      },

      getCurrentLanguage: () => {
        const state = get();
        if (state.selectedLanguage) {
          return state.selectedLanguage;
        }

        // 브라우저 기본 언어 감지
        const browserLang = browser.i18n.getUILanguage();
        return browserLang.startsWith('ko') ? 'ko' : 'en';
      },
    }),
    {
      name: 'tyquill-language-preference',
      version: 1,
    }
  )
);