import { create } from 'zustand';
import { browser } from 'wxt/browser';

export type SupportedLanguage = 'ko' | 'en';

interface LanguageState {
  selectedLanguage: SupportedLanguage | null;
  setLanguage: (language: SupportedLanguage | null) => Promise<void>;
  getCurrentLanguage: () => SupportedLanguage;
  initializeLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()((set, get) => ({
  selectedLanguage: null,

  setLanguage: async (language: SupportedLanguage | null) => {
    // Chrome storage에 저장
    await browser.storage.sync.set({ 'tyquill-language-preference': language });
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

  initializeLanguage: async () => {
    try {
      const result = await browser.storage.sync.get('tyquill-language-preference');
      const savedLanguage = result['tyquill-language-preference'];
      if (savedLanguage) {
        set({ selectedLanguage: savedLanguage });
      }
    } catch (error) {
      console.warn('Failed to load language preference:', error);
    }
  },
}));