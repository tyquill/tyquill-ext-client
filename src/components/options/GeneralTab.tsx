import React from 'react';
import styles from '../../options/App.module.css';
import { useI18n } from '../../hooks/useI18n';
import { LanguageSelector } from '../common/LanguageSelector';

interface GeneralTabProps {
  settings: {
    floatingButtonVisible: boolean;
  };
  onSettingChange: (key: keyof GeneralTabProps['settings'], value: any) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onSettingChange }) => {
  const { t } = useI18n();

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>{t('options_generalSettings')}</h2>
      
      <div className={styles.settingGroup}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingLabel}>{t('options_floatingButtonTitle')}</h3>
            <p className={styles.settingDescription}>
              {t('options_floatingButtonDescription')}
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.floatingButtonVisible}
              onChange={(e) => onSettingChange('floatingButtonVisible', e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingLabel}>{t('options_languageTitle')}</h3>
            <p className={styles.settingDescription}>
              {t('options_languageDescription')}
            </p>
          </div>
          <LanguageSelector />
        </div>
      </div>

    </div>
  );
};

export default GeneralTab; 