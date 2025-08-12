import React, { useState, useEffect, useRef } from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  estimatedTimeSeconds: number;
  isCompleted: boolean;
  onComplete?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  estimatedTimeSeconds, 
  isCompleted, 
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'normal' | 'slow' | 'log' | 'completing'>('normal');
  const [showComplimentMessage, setShowComplimentMessage] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef(false);
  const currentPhaseRef = useRef<'normal' | 'slow' | 'log' | 'completing'>('normal');

  // 컴포넌트 마운트 시 한 번만 초기화
  useEffect(() => {
    startTimeRef.current = Date.now();
    setProgress(0);
    setCurrentPhase('normal');
    setShowComplimentMessage(false);
    setElapsedSeconds(0);
    completedRef.current = false;
    currentPhaseRef.current = 'normal';
  }, []); // 빈 배열로 마운트 시에만 실행

  // 경과 시간 추적
  useEffect(() => {
    elapsedTimeIntervalRef.current = setInterval(() => {
      if (!completedRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
      }
    };
  }, []);

  // 프로그레스 업데이트 로직
  useEffect(() => {
    const updateProgress = () => {
      if (completedRef.current) return;

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const expectedProgress = Math.min((elapsedSeconds / estimatedTimeSeconds) * 100, 100);

      // 완료 상태 확인 및 phase 전환
      if (isCompleted && currentPhaseRef.current !== 'completing') {
        currentPhaseRef.current = 'completing';
        setCurrentPhase('completing');
        setShowComplimentMessage(false);
      }

      setProgress(prevProgress => {
        if (currentPhaseRef.current === 'completing') {
          // 완료 단계: 현재 진행률에서 적당히 빠른 속도로 100%까지
          const progressIncrease = Math.max(0.5, (100 - prevProgress) * 0.15);
          const newProgress = Math.min(100, prevProgress + progressIncrease);
          
          if (newProgress >= 100 && !completedRef.current) {
            completedRef.current = true;
            if (onComplete) {
              setTimeout(onComplete, 300);
            }
          }
          return newProgress;
        }

        // 85% 직전의 정상 속도 계산 (연속성을 위해)
        const normalSpeed = 100 / estimatedTimeSeconds; // %/초 단위
        
        if (prevProgress >= 85 && !isCompleted) {
          // 85~99.9% 구간: 단일 logarithmic scale 적용
          if (currentPhaseRef.current !== 'log') {
            currentPhaseRef.current = 'log';
            setCurrentPhase('log');
          }
          
          // 95%에 도달했을 때 메시지 표시
          if (prevProgress >= 95 && !showComplimentMessage) {
            setShowComplimentMessage(true);
          }
          
          // 85% 시점 계산
          const timeAt85Percent = estimatedTimeSeconds * 0.85;
          const overTimeFrom85 = Math.max(0, elapsedSeconds - timeAt85Percent);
          
          // 85% 직전 속도를 그대로 이어받아 로그적으로 감소
          // 목표: 예상 시간의 2배일 때 99.9% 도달
          // 85%부터 2배 시간까지의 경과: 2 * estimatedTimeSeconds - 0.85 * estimatedTimeSeconds = 1.15 * estimatedTimeSeconds
          // 99.9% = 85% + 14.9% * (1 - exp(-1.15 * estimatedTimeSeconds / k))
          // exp(-1.15 * estimatedTimeSeconds / k) ≈ 0.001 (99.9% 도달을 위해)
          const logConstant = (1.15 * estimatedTimeSeconds) / 6.908; // ln(0.001) = -6.908
          const logProgress = 85 + 14.9 * (1 - Math.exp(-overTimeFrom85 / logConstant));
          
          return Math.max(prevProgress, Math.min(logProgress, 99.9));
        } else {
          // 정상 진행 (85% 미만)
          return Math.min(expectedProgress, 85);
        }
      });
    };

    intervalRef.current = setInterval(updateProgress, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [estimatedTimeSeconds, isCompleted, onComplete]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const getProgressMessage = () => {
    if (showComplimentMessage) {
      return "작가님이 정말 훌륭한 자료를 제공해주셨네요! 조금만 더 기다려주세요...";
    }
    return null;
  };

  const isProgressComplete = progress >= 100;

  return (
    <div className={styles.container}>
      <div className={`${styles.progressText} ${isProgressComplete ? styles.completedText : ''}`}>
        {progress.toFixed(1)}%
      </div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={`${styles.progressFill} ${isProgressComplete ? styles.completed : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className={styles.timeInfo}>
        <span>예상 소요 시간: {formatTime(estimatedTimeSeconds)}</span>
        <span>경과 시간: {formatTime(elapsedSeconds)}</span>
      </div>
      
      {getProgressMessage() && (
        <div className={styles.progressMessage}>
          {getProgressMessage()}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
