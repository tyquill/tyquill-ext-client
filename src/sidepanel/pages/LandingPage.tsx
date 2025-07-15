import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const { login, isLoading, error, clearError } = useAuth();

  const handleStartClick = async () => {
    try {
      clearError();
      await login();
      onStart(); // 인증 성공 후 메인 페이지로 이동
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className={styles.landingPage}>
      <div className={styles.landingContent}>
        <div className={styles.logoSection}>
          <h1 className={styles.logo}>Tyquill</h1>
          <p className={styles.tagline}>AI-powered writing assistant</p>
        </div>
        
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>✨</div>
            <h3>Smart Writing</h3>
            <p>AI가 도와주는 스마트한 글쓰기</p>
          </div>
          
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>🚀</div>
            <h3>Fast & Easy</h3>
            <p>빠르고 간편한 사용법</p>
          </div>
          
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Perfect Results</h3>
            <p>완벽한 글쓰기 결과</p>
          </div>
        </div>
        
        <div className={styles.ctaSection}>
          {error && (
            <div className={styles.errorMessage}>
              ❌ {error}
            </div>
          )}
          <button 
            className={styles.startButton}
            onClick={handleStartClick}
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : 'Google로 시작하기'}
          </button>
          <p className={styles.startDescription}>
            Tyquill과 함께 더 나은 글쓰기를 시작해보세요
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 