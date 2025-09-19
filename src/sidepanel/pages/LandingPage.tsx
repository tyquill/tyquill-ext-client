import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToastHelpers } from '../../hooks/useToast';
import { useI18n } from '../../hooks/useI18n';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const { showSuccess, showError } = useToastHelpers();
  const { t } = useI18n();

  const handleStartClick = async () => {
    try {
      clearError();
      await login();
      showSuccess(t('landingPage_loginSuccess'), t('landingPage_welcomeMessage'));
      onStart(); // 인증 성공 후 메인 페이지로 이동
    } catch (err: any) {
      const errorMessage = err?.message || t('landingPage_loginError');
      showError(t('landingPage_loginFailed'), errorMessage);
    }
  };

  return (
    <div className={styles.landingPage}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>Tyquill</h1>
      </header>

      {/* Core content */}
      <main className={styles.mainContent}>
        <h2 className={styles.title}>
          {t('landingPage_title').split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < t('landingPage_title').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
        <p className={styles.description}>
          {t('landingPage_description')}
        </p>

        {/* CTA section */}
        <div className={styles.ctaSection}>
          
          {/* Supported platforms */}
          <div className={styles.platforms}>
            <span className={styles.platformsLabel}>{t('landingPage_supportedPlatforms')}</span>
            <div className={styles.platformsList}>
              <div className={styles.platform}>
                <img 
                  src="https://cdn.maily.so/images/green_logo.png"
                  alt="Maily.so"
                  className={styles.platformLogo}
                />
              </div>
              <div className={styles.platformComingSoon}>
                {t('landingPage_comingSoon')}
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Google sign-in */}
          <button
            className={styles.googleButton}
            onClick={handleStartClick}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>{isLoading ? t('landingPage_loginLoading') : t('landingPage_startWithGoogle')}</span>
          </button>
        </div>
      </main>

      {/* Footer
      <footer className={styles.footer}>
        <span>Tyquill은 개인정보 보호를 최우선으로 합니다.</span>
        <div className={styles.footerLinks}>
          <span>&copy; {new Date().getFullYear()} Tyquill</span>
          <span className={styles.footerDivider}>|</span>
          <a href="#terms">이용약관</a>
          <span className={styles.footerDivider}>|</span>
          <a href="#privacy">개인정보처리방침</a>
        </div>
      </footer> */}
    </div>
  );
};

export default LandingPage; 