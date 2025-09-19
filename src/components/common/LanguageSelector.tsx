import React from 'react';
import { IoLanguage } from 'react-icons/io5';
import { useLanguageStore, SupportedLanguage } from '../../stores/languageStore';
import { useI18n } from '../../hooks/useI18n';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className,
  compact = false
}) => {
  const { t, currentLanguage } = useI18n();
  const { setLanguage } = useLanguageStore();

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'en', label: t('language_english') },
    { code: 'ko', label: t('language_korean') },
  ];

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage !== currentLanguage) {
      await setLanguage(newLanguage);
    }
  };

  if (compact) {
    return (
      <div className={`${styles.compactSelector} ${className || ''}`}>
        <IoLanguage size={16} className={styles.icon} />
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className={styles.compactSelect}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`${styles.languageSelector} ${className || ''}`}>
      <select
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
        className={styles.select}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};