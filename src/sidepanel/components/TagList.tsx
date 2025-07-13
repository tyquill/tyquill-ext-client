import React, { useState, useEffect, useRef } from 'react';
import styles from '../pages/PageStyles.module.css';

interface TagListProps {
  tags: string[];
  maxVisibleTags?: number;
  className?: string;
}

export const TagList: React.FC<TagListProps> = ({ 
  tags, 
  maxVisibleTags = 2,
  className = ''
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const visibleTags = tags.slice(0, maxVisibleTags);
  const remainingTags = tags.length - maxVisibleTags;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showAllTags) {
        // 툴팁이나 +N 버튼 클릭이 아닌 경우에만 닫기
        if (containerRef.current && !containerRef.current.contains(target) &&
            !(target instanceof HTMLButtonElement && target.classList.contains(styles.moreTag))) {
          setShowAllTags(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAllTags]);

  return (
    <div className={`${styles.tagContainer} ${className}`} ref={containerRef}>
      {visibleTags.map((tag, index) => (
        <span key={index} className={styles.tag}>#{tag}</span>
      ))}
      {remainingTags > 0 && (
        <button
          className={`${styles.tag} ${styles.moreTag}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowAllTags(!showAllTags);
          }}
        >
          +{remainingTags}
        </button>
      )}
      {showAllTags && (
        <div 
          className={styles.tagListTooltip}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.tagList}>
            {tags.map((tag, index) => (
              <span key={index} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 