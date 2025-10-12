import React, { useEffect, useState } from 'react';
import { IoCheckmarkCircle } from 'react-icons/io5';
import styles from './ScrapToast.module.css';
import Confetti from '../../sidepanel/Confetti/Confetti';

interface ScrapToastProps {
  title: string;
  url?: string;
  onClose: () => void;
  duration?: number;
}

const ScrapToast: React.FC<ScrapToastProps> = ({
  title,
  url,
  onClose,
  duration = 4000,
}) => {
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
            colors={['#DE7356', '#E89278', '#F2A68A', '#FFC4B0', '#FFD9CC']}
          />
        </div>
      )}

      {/* Toast Content */}
      <div className={styles.toast}>
        <div className={styles.iconContainer}>
          <IoCheckmarkCircle className={styles.icon} />
        </div>
        <div className={styles.content}>
          <div className={styles.title}>스크랩 완료!</div>
          <div className={styles.pageTitle}>{title}</div>
          {url && <div className={styles.url}>{url}</div>}
        </div>
      </div>
    </div>
  );
};

export default ScrapToast;
