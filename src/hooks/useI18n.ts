import { useCallback } from 'react';
import { useLanguageStore, SupportedLanguage } from '../stores/languageStore';
import { getTranslation, TranslationKey } from '../utils/translations';

/**
 * Custom hook for i18n support with manual language selection
 * Provides translation functions with runtime language switching
 */
export const useI18n = () => {
  const { getCurrentLanguage } = useLanguageStore();

  /**
   * Get translated message
   * @param key - The translation key
   * @returns Translated string
   */
  const t = useCallback((key: TranslationKey): string => {
    const currentLang = getCurrentLanguage();
    return getTranslation(currentLang, key);
  }, [getCurrentLanguage]);

  /**
   * Get current effective language
   * @returns Current language code ('ko' | 'en')
   */
  const currentLanguage = getCurrentLanguage();

  /**
   * Check if the current language is Korean
   * @returns true if current language is Korean
   */
  const isKorean = useCallback((): boolean => {
    return getCurrentLanguage() === 'ko';
  }, [getCurrentLanguage]);

  /**
   * Check if the current language is English
   * @returns true if current language is English
   */
  const isEnglish = useCallback((): boolean => {
    return getCurrentLanguage() === 'en';
  }, [getCurrentLanguage]);

  return {
    t,
    currentLanguage,
    isKorean,
    isEnglish,
  };
};

// Export a standalone translation function for use outside of React components
export const t = (key: TranslationKey, language?: SupportedLanguage): string => {
  const lang = language || useLanguageStore.getState().getCurrentLanguage();
  return getTranslation(lang, key);
};