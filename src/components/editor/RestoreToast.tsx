import React, { useEffect, useState } from 'react';
import { IoCheckmarkCircle } from 'react-icons/io5';
import styles from './RestoreToast.module.css';
import Confetti from '../sidepanel/Confetti/Confetti';
import { useI18n } from '../../hooks/useI18n';

interface RestoreToastProps {
  versionNumber: number;
  timestamp: string;
  onClose: () => void;
  duration?: number;
}

const RestoreToast: React.FC<RestoreToastProps> = ({
  versionNumber,
  timestamp,
  onClose,
  duration = 4000,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // 컴포넌트 마운트 후 애니메이션 시작
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Confetti는 2초 후 숨김
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);

    // Toast는 duration 후 닫힘
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => {
        clearTimeout(timer);
        clearTimeout(confettiTimer);
      };
    }

    return () => clearTimeout(confettiTimer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300); // 애니메이션 시간과 맞춤
  };

  return (
    <div
      className={`${styles.toastContainer} ${isVisible ? styles.visible : ''} ${isLeaving ? styles.leaving : ''}`}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div className={styles.confettiWrapper}>
          <Confetti
            particleCount={60}
            durationMs={2000}
            colors={['#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9']}
          />
        </div>
      )}

      {/* Toast Content */}
      <div className={styles.toast}>
        <div className={styles.iconContainer}>
          <IoCheckmarkCircle className={styles.icon} />
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{t('editor_restoreCompleted')}</div>
          <div className={styles.version}>
            {t('editor_restoredToVersion').replace('{versionNumber}', String(versionNumber))}
          </div>
          <div className={styles.timestamp}>{timestamp}</div>
        </div>
      </div>
    </div>
  );
};

export default RestoreToast;
