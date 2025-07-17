import React, { useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoWarning, IoClose, IoAlert } from 'react-icons/io5';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 후 애니메이션 시작
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // 애니메이션 시간과 맞춤
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <IoCheckmarkCircle className={styles.icon} />;
      case 'error':
        return <IoClose className={styles.icon} />;
      case 'warning':
        return <IoWarning className={styles.icon} />;
      case 'info':
        return <IoAlert className={styles.icon} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`${styles.toast} ${styles[type]} ${isVisible ? styles.visible : ''} ${isLeaving ? styles.leaving : ''}`}
    >
      <div className={styles.iconContainer}>
        {getIcon()}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        {message && <div className={styles.message}>{message}</div>}
      </div>
      <button 
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="닫기"
      >
        <IoClose size={16} />
      </button>
    </div>
  );
};