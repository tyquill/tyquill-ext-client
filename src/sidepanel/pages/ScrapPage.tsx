import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IoAdd, IoTrash, IoChevronDown, IoClose, IoClipboard, IoCheckmark } from 'react-icons/io5';
import styles from './PageStyles.module.css';
import { TagSelector } from '../components/TagSelector';
import { TagList } from '../components/TagList';
import { mockScraps, Scrap } from '../../mock/data';
import { scrapService } from '../../services/scrapService';

const ScrapPage: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [draftTag, setDraftTag] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const [isClipping, setIsClipping] = useState(false);
  const [clipStatus, setClipStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const loadingTimeoutRef = useRef<number>();
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

  // 웹 클리핑 기능
  const handleClipCurrentPage = useCallback(async () => {
    if (isClipping) return;

    try {
      setIsClipping(true);
      setClipStatus('idle');

      // 현재 활성 탭 정보 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      console.log('📋 Attempting to clip page on tab:', {
        tabId: tab.id,
        url: tab.url,
        title: tab.title
      });

      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('chrome://') || 
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('이 페이지에서는 스크랩할 수 없습니다. (chrome://, extension:// 등 제한된 페이지)');
      }

      // Content Script가 로드되었는지 확인
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch (pingError) {
        console.warn('⚠️ Content script not ready, injecting...');
        
        // Content script 수동 주입 시도
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript/index.js']
        });
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Content Script로 클리핑 요청
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CLIP_PAGE',
        options: { includeMetadata: true }
      });

      if (response.success) {
        console.log('✅ Page clipped:', response.data);
        
        // 스크랩 서비스로 저장
        const scrapResponse = await scrapService.quickScrap(
          response.data,
          '', // userComment
          selectedTags // 선택된 태그들
        );

        console.log('✅ Scrap saved:', scrapResponse);
        setClipStatus('success');
        
        // 성공 상태 2초 후 리셋
        setTimeout(() => setClipStatus('idle'), 2000);
      } else {
        throw new Error(response.error || 'Clipping failed');
      }
    } catch (error: any) {
      console.error('❌ Clipping error:', error);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      setClipStatus('error');
      
      // 에러 상태 3초 후 리셋
      setTimeout(() => setClipStatus('idle'), 3000);
    } finally {
      setIsClipping(false);
    }
  }, [isClipping, selectedTags]);

  const handleClipSelection = useCallback(async () => {
    if (isClipping) return;

    try {
      setIsClipping(true);
      setClipStatus('idle');

      // 현재 활성 탭 정보 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('chrome://') || 
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('이 페이지에서는 스크랩할 수 없습니다. (chrome://, extension:// 등 제한된 페이지)');
      }

      // Content Script로 선택 영역 클리핑 요청
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CLIP_SELECTION'
      });

      if (response.success) {
        console.log('✅ Selection clipped:', response.data);
        
        // 스크랩 서비스로 저장
        const scrapResponse = await scrapService.quickScrap(
          response.data,
          '', // userComment
          selectedTags // 선택된 태그들
        );

        console.log('✅ Scrap saved:', scrapResponse);
        setClipStatus('success');
        
        // 성공 상태 2초 후 리셋
        setTimeout(() => setClipStatus('idle'), 2000);
      } else {
        throw new Error(response.error || 'Selection clipping failed');
      }
    } catch (error: any) {
      console.error('❌ Selection clipping error:', error);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      setClipStatus('error');
      
      // 에러 상태 3초 후 리셋
      setTimeout(() => setClipStatus('idle'), 3000);
    } finally {
      setIsClipping(false);
    }
  }, [isClipping, selectedTags]);

  // 인증 상태 확인
  const checkAuthStatus = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(['authState']);
      const authState = result.authState;
      const hasToken = !!(authState?.accessToken && authState?.isAuthenticated);
      setIsAuthenticated(hasToken);
      setAuthChecked(true);
      
      console.log('🔐 Auth status:', { 
        hasToken, 
        isAuthenticated: authState?.isAuthenticated,
        hasAccessToken: !!authState?.accessToken,
        user: authState?.user?.email 
      });
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  }, []);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 로그인 페이지로 이동
  const handleLogin = useCallback(() => {
    // 여기서는 사용자에게 로그인이 필요하다는 메시지만 표시
    alert('로그인이 필요합니다. Side Panel의 다른 탭에서 로그인을 완료해주세요.');
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
          {!authChecked ? (
            <div className={styles.loadingAuth}>인증 상태 확인 중...</div>
          ) : !isAuthenticated ? (
            <div className={styles.authRequired}>
              <div className={styles.authMessage}>
                🔐 로그인이 필요합니다
              </div>
              <button 
                className={`${styles.addButton} ${styles.loginButton}`}
                onClick={handleLogin}
              >
                로그인 안내
              </button>
            </div>
          ) : (
            <div className={styles.clipButtonGroup}>
              <button 
                className={`${styles.addButton} ${isClipping ? styles.loading : ''}`}
                onClick={handleClipCurrentPage}
                disabled={isClipping}
              >
                {clipStatus === 'success' ? (
                  <>
                    <IoCheckmark size={20} />
                    저장됨
                  </>
                ) : clipStatus === 'error' ? (
                  <>
                    <IoClose size={20} />
                    실패
                  </>
                ) : isClipping ? (
                  <>
                    <IoClipboard size={20} />
                    클리핑 중...
                  </>
                ) : (
                  <>
                    <IoClipboard size={20} />
                    페이지 스크랩
                  </>
                )}
              </button>
              
              <button 
                className={`${styles.addButton} ${styles.secondaryButton}`}
                onClick={handleClipSelection}
                disabled={isClipping}
              >
                선택 영역
              </button>
            </div>
          )}
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
          {scraps.map((scrap) => (
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