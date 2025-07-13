import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IoAdd, IoTrash, IoChevronDown, IoClose } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { TagSelector } from '../components/TagSelector';
import { TagList } from '../components/TagList';
import { mockScraps, Scrap } from '../../mock/data';

const ScrapPage: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [draftTag, setDraftTag] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const tagTooltipRef = useRef<HTMLDivElement>(null);
  
  const allTags = [
    'AI', 'Technology', 'Trends', 'Automation', 'Productivity',
    'Chrome', 'Development', 'Web', 'Design', 'UI/UX',
    'System', 'Frontend', 'Architecture', 'React', 'Performance',
    'JavaScript', 'TypeScript', 'Accessibility', 'Standards'
  ];

  const scraps = mockScraps;

  // 핸들러를 useCallback으로 감싸서 안정화
  const handleTagSelect = useCallback((tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleTagRemove = useCallback((tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  const toggleDropdown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDropdownOpen(prev => !prev);
  };

  const handleAddTag = useCallback((scrapId: string, tag: string) => {
    if (tag.trim()) {
      // 실제 구현에서는 API 호출 등을 통해 태그를 추가하고 상태를 업데이트해야 합니다.
      console.log('Add tag:', tag, 'to scrap:', scrapId);
    }
    setActiveInputId(null);
    setDraftTag('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, scrapId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(scrapId, draftTag.trim());
    } else if (e.key === 'Escape') {
      setActiveInputId(null);
      setDraftTag('');
    }
  }, [draftTag, handleAddTag]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    setDraftTag(e.currentTarget.value);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTag(e.target.value);
  }, []);

  // 외부 클릭 핸들러 수정
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 태그 입력 툴팁 처리
      if (activeInputId !== null) {
        const tooltip = document.querySelector(`[data-tooltip-id="${activeInputId}"]`);
        if (tooltip && !tooltip.contains(target) && 
            !(target instanceof HTMLInputElement && target.classList.contains(styles.tagInput))) {
          setActiveInputId(null);
          setDraftTag('');
        }
      }

      // 태그 목록 툴팁 처리
      if (showAllTags !== null) {
        const tagListTooltip = document.querySelector(`[data-taglist-id="${showAllTags}"]`);
        if (tagListTooltip && !tagListTooltip.contains(target) &&
            !(target instanceof HTMLButtonElement && target.classList.contains(styles.moreTag))) {
          setShowAllTags(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeInputId, showAllTags]);

  // 불필요한 useEffect 제거 (inputRef.current?.focus())

  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setLoading(true);
          // 이전 타임아웃이 있다면 클리어
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          // 새로운 타임아웃 설정
          loadingTimeoutRef.current = setTimeout(() => {
            // TODO: Implement actual data fetching
            setLoading(false);
          }, 1000);
        }
      },
      { threshold: 0.5 }
    );

    if (lastScrapRef.current) {
      observer.observe(lastScrapRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // 컴포넌트 언마운트 시 타임아웃 클리어
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, hasMore]);

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return '';
    }
  };

  const ScrapItem = React.memo<{ scrap: Scrap; onDelete: () => void }>(({ scrap, onDelete }) => {
    return (
      <div className={styles.contentItem} data-url={scrap.url}>
        <div className={styles.contentHeader}>
          <a href={scrap.url} target="_blank" rel="noopener noreferrer" className={styles.contentTitle}>
            {scrap.title}
          </a>
          <button onClick={onDelete} className={styles.deleteButton}>
            <IoTrash />
          </button>
        </div>
        <div className={styles.contentDescription}>{scrap.content}</div>
        <div className={styles.contentFooter}>
          <div className={styles.tags}>
            <button 
              className={styles.addTagButton}
              onClick={(e) => {
                e.stopPropagation();
                setActiveInputId(activeInputId === scrap.id ? null : scrap.id);
                setDraftTag('');
                setShowAllTags(null);
              }}
            >
              <IoAdd size={14} />
            </button>
            <TagList tags={scrap.tags} />
            {activeInputId === scrap.id && (
              <div 
                className={styles.tagInputTooltip} 
                data-tooltip-id={scrap.id}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={draftTag}
                  onChange={handleChange}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onKeyDown={(e) => handleKeyDown(e, scrap.id)}
                  placeholder="태그 입력 후 Enter"
                  className={styles.tagInput}
                  autoFocus
                />
                <button 
                  className={styles.tagSubmitButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddTag(scrap.id, draftTag.trim());
                  }}
                >
                  추가
                </button>
              </div>
            )}
          </div>
          <div className={styles.contentDate}>{scrap.date}</div>
        </div>
      </div>
    );
  });

  return (
    <div className={styles.pageContainer}>
      <div className={styles.fixedContent}>
        <div className={styles.addButtonContainer}>
          <button className={styles.addButton}>
            <IoAdd size={20} />
            스크랩 추가
          </button>
        </div>

        <TagSelector
          availableTags={allTags}
          selectedTags={selectedTags}
          onTagSelect={(tag) => setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
          )}
          onTagRemove={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
        />
      </div>

      <div className={styles.scrollableContent}>
        <div className={styles.scrapList}>
          {scraps.map((scrap, index) => (
            <ScrapItem
              key={scrap.id} 
              scrap={scrap} 
              onDelete={() => {
                // TODO: Implement actual deletion logic
                console.log('Delete scrap:', scrap.id);
              }}
            />
          ))}
        </div>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIndicator}>
              Loading...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrapPage; 