import React, { useState, useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';
import styles from '../../../sidepanel/pages/PageStyles.module.css';

interface TagListProps {
  tags: string[];
  maxVisibleTags?: number;
  className?: string;
  onTagRemove?: (tagName: string) => void;
  showRemoveButton?: boolean;
}

export const TagList: React.FC<TagListProps> = ({ 
  tags, 
  maxVisibleTags = 2,
  className = '',
  onTagRemove,
  showRemoveButton = false
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 태그 길이 제한 및 ellipsis 처리
  const truncateTag = (tag: string, maxLength: number = 12) => {
    return tag.length > maxLength ? `${tag.substring(0, maxLength)}...` : tag;
  };
  
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

  const handleTagRemove = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTagRemove) {
      onTagRemove(tagName);
    }
  };

  return (
    <div className={`${styles.tagContainer} ${className}`} ref={containerRef}>
      {visibleTags.map((tag, index) => (
        <span key={index} className={styles.tag} title={tag}>
          {truncateTag(tag)}
          {showRemoveButton && onTagRemove && (
            <button
              className={styles.tagRemoveButton}
              onClick={(e) => handleTagRemove(tag, e)}
              title={`${tag} 태그 삭제`}
            >
              <IoClose size={12} />
            </button>
          )}
        </span>
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
              <span key={index} className={styles.tag} title={tag}>
                {truncateTag(tag, 20)}
                {showRemoveButton && onTagRemove && (
                  <button
                    className={styles.tagRemoveButton}
                    onClick={(e) => handleTagRemove(tag, e)}
                    title={`${tag} 태그 삭제`}
                  >
                    <IoClose size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 