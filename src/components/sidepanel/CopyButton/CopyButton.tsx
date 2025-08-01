import React, { useState } from 'react';
import { IoClipboard, IoCheckmark } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CopyButton.module.css';
import { useToastHelpers } from '../../../hooks/useToast';
import { htmlToMarkdown } from '../../../utils/markdownConverter';
import { animations, getAnimation } from '../../../utils/animations';

interface CopyButtonProps {
  title: string;
  content: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ title, content }) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // HTML 태그가 포함되어 있는지 확인하는 함수
  const containsHtmlTags = (text: string): boolean => {
    const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlTagRegex.test(text);
  };

  // 연속된 개행 문자를 정리하는 함수
  const normalizeNewlines = (text: string): string => {
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  const handleCopy = async () => {
    if (!title.trim() || !content.trim()) {
      showError('복사 실패', '제목과 내용이 모두 있어야 복사할 수 있습니다.');
      return;
    }

    setIsLoading(true);
    
    try {
      // 화면에 렌더링된 콘텐츠 요소를 찾기
      const contentDisplay = document.querySelector('.contentDisplay, [class*="contentDisplay"]');
      
      if (contentDisplay) {
        // 제목 HTML 생성
        const titleHtml = `<h1>${title}</h1>`;
        
        // 렌더링된 HTML 콘텐츠와 플레인 텍스트 모두 포함
        const htmlContent = titleHtml + contentDisplay.innerHTML;
        const textContent = title + '\n\n' + (contentDisplay.textContent || (contentDisplay as HTMLElement).innerText || '');
        
        // HTML과 텍스트 모두 클립보드에 저장 (rich text paste 지원)
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([textContent], { type: 'text/plain' })
          })
        ]);
        
        showSuccess('복사 완료', '서식이 포함된 형태로 클립보드에 복사되었습니다.');
        
        // Show success animation
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
      } else {
        // 렌더링된 요소를 찾을 수 없는 경우 원본 콘텐츠 복사
        let cleanContent = content;
        
        // HTML 태그가 포함된 경우 마크다운으로 변환
        if (containsHtmlTags(content)) {
          cleanContent = htmlToMarkdown(content);
        }
        
        // 연속된 개행 정리
        cleanContent = normalizeNewlines(cleanContent);
        
        // 제목과 내용을 마크다운 형식으로 결합
        const fullContent = `# ${title}\n\n${cleanContent}`;
        
        await navigator.clipboard.writeText(fullContent);
        showSuccess('복사 완료', '마크다운 형식으로 클립보드에 복사되었습니다.');
        
        // Show success animation
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1500);
      }
    } catch (error) {
      console.error('Copy error:', error);
      showError('복사 실패', '클립보드 복사 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button 
      className={styles.copyButton}
      onClick={handleCopy}
      title="클립보드에 복사"
      disabled={isLoading}
      {...getAnimation({
        whileHover: animations.buttonHover,
        whileTap: animations.buttonTap
      })}
      animate={showSuccessAnimation ? animations.successPulse : {}}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            {...getAnimation(animations.loadingSpinner)}
            className={styles.loadingIcon}
          >
            <IoClipboard size={18} />
          </motion.div>
        ) : showSuccessAnimation ? (
          <motion.div
            key="success"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <IoCheckmark size={18} />
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            {...getAnimation({
              whileHover: animations.iconHover
            })}
          >
            <IoClipboard size={18} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default CopyButton;