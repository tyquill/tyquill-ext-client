import React, { useState, useEffect } from 'react';
import styles from '../../options/App.module.css';
import { browser } from 'wxt/browser';
import { useI18n } from '../../hooks/useI18n';

const AboutTab: React.FC = () => {
  const { t } = useI18n();
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const getManifestVersion = () => {
      try {
        // Chrome Extension API를 통해 manifest 정보 가져오기
        if (browser.runtime && browser.runtime.getManifest) {
          const manifest = browser.runtime.getManifest();
          setVersion(manifest.version);
        }
      } catch (error) {
        console.error(t('options_versionError'), error);
        setVersion('1.1.2'); // fallback
      }
    };

    getManifestVersion();
  }, []);

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>{t('options_aboutTitle')}</h2>
      
      <div className={styles.aboutSection}>
        <div className={styles.versionInfo}>
          <h3 className={styles.versionTitle}>{t('options_version')}</h3>
          <p className={styles.versionNumber}>{version}</p>
        </div>

        <div className={styles.description}>
          <p>
            {t('options_aboutDescription')}
          </p>
        </div>

        {/* <div className={styles.links}>
          <a href="#" className={styles.link}>{t('options_privacyPolicy')}</a>
          <a href="#" className={styles.link}>{t('options_termsOfService')}</a>
          <a href="#" className={styles.link}>{t('options_support')}</a>
        </div> */}
      </div>
    </div>
  );
};

export default AboutTab; 