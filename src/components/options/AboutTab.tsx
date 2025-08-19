import React, { useState, useEffect } from 'react';
import styles from '../../options/App.module.css';
import { browser } from 'wxt/browser';

const AboutTab: React.FC = () => {
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
        console.error('버전 정보를 가져오는데 실패했습니다:', error);
        setVersion('1.1.2'); // fallback
      }
    };

    getManifestVersion();
  }, []);

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Tyquill 정보</h2>
      
      <div className={styles.aboutSection}>
        <div className={styles.versionInfo}>
          <h3 className={styles.versionTitle}>버전</h3>
          <p className={styles.versionNumber}>{version}</p>
        </div>

        <div className={styles.description}>
          <p>
            Tyquill은 웹사이트에서 리소스를 쉽게 저장하고 
            전문 뉴스레터 AI에게 초안 생성을 맡길 수 있는 도구입니다.
          </p>
        </div>

        {/* <div className={styles.links}>
          <a href="#" className={styles.link}>개인정보처리방침</a>
          <a href="#" className={styles.link}>이용약관</a>
          <a href="#" className={styles.link}>지원</a>
        </div> */}
      </div>
    </div>
  );
};

export default AboutTab; 