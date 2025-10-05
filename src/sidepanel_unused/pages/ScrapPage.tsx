import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { IoAdd, IoTrash, IoClose, IoCheckmark, IoDocument } from 'react-icons/io5';
import { FaBookmark } from 'react-icons/fa6';
import { LuLink, LuFileText, LuImage, LuVideo, LuMusic, LuFile } from 'react-icons/lu';
import { browser } from 'wxt/browser';
import styles from './PageStyles.module.css';
import scrapStyles from './ScrapPage.module.css';
import layoutStyles from './CommonLayout.module.css';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { scrapService } from '../../services/scrapService';
import { useToastHelpers } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import { Scrap } from '../../types/scrap.d';
import { clipAndScrapCurrentPage, ScrapStatus } from '../../utils/scrapHelper';
import Tooltip from '../../components/common/Tooltip';
import { PDFUploadModal } from '../../components/sidepanel/PDFUploadModal/PDFUploadModal';
import { trackPDFUploadModalOpenedBridge } from '../../analytics/bridge';

export interface ScrapPageRef {
  refreshList: () => void;
}

const ScrapPage = forwardRef<ScrapPageRef, {}>((_, ref) => {
  const { showSuccess, showError, showWarning } = useToastHelpers();
  const { logout } = useAuth();
  const { t } = useI18n();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showAllTags, setShowAllTags] = useState<string | null>(null);
  const [isClipping, setIsClipping] = useState(false);
  const [clipStatus, setClipStatus] = useState<ScrapStatus>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [scraps, setScraps] = useState<Scrap[]>([]);
  const [scrapsLoading, setScrapsLoading] = useState(false);
  const [scrapsError, setScrapsError] = useState<string | null>(null);
  // createdAt timestamp map for scraps (ms since epoch)
  const [scrapTimestamps, setScrapTimestamps] = useState<Record<string, number>>({});
  // 무한스크롤 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Undo delete state for scraps
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteTimeoutId, setDeleteTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [deletedScrap, setDeletedScrap] = useState<Scrap | null>(null);
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPDFUploadModal, setShowPDFUploadModal] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
      }
    };
  }, [deleteTimeoutId]);

  useEffect(() => {
    const fetchAllTags = async () => {
      const tags = Array.from(new Set(scraps.map(scrap => scrap.tags).flat()));
      setAllTags(tags);
    };
    fetchAllTags();
  }, [scraps]);

  // 선택된 태그에 따라 필터링된 스크랩 목록
  const filteredScraps = useMemo(() => {
    if (selectedTags.length === 0) {
      return scraps; // 선택된 태그가 없으면 모든 스크랩 표시
    }
    
    return scraps.filter(scrap => {
      // 선택된 태그 중 하나라도 스크랩에 포함되어 있으면 표시
      return selectedTags.some(selectedTag => 
        scrap.tags.includes(selectedTag)
      );
    });
  }, [scraps, selectedTags]);

  // 스크랩 목록 불러오기 (v3 무한스크롤 지원)
  const loadScraps = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isAuthenticated) return;

    try {
      setScrapsLoading(true);
      setScrapsError(null);

      const result = await scrapService.getScrapsV3({
        page,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });

      // ScrapResponse를 Scrap 형태로 변환
      const convertedScraps: Scrap[] = result.scraps.map(scrap => {
        // 서버의 원본 type을 그대로 보존 (pdf, image, video, audio, upload, webclip)
        const originalType = scrap.type as 'webclip' | 'pdf' | 'image' | 'video' | 'audio' | 'upload';

        return {
          id: scrap.scrapId.toString(),
          title: scrap.title,
          content: scrap.contentInfo?.text || scrap.content,
          url: scrap.url,
          date: new Date(scrap.createdAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          tags: scrap.tags ? scrap.tags.map(tag => tag.name) : [],
          faviconUrl: scrap.webpage?.site?.favicon_url,
          type: originalType,
        };
      });

      // append가 true면 기존 데이터에 추가, false면 새로 설정
      setScraps(prev => append ? [...prev, ...convertedScraps] : convertedScraps);

      // 페이지네이션 상태 업데이트
      setHasMore(result.hasMore);
      setCurrentPage(page);

      // createdAt 타임스탬프 저장 (정렬용)
      const tsMap: Record<string, number> = {};
      for (const s of result.scraps) {
        tsMap[s.scrapId.toString()] = new Date(s.createdAt).getTime();
      }
      setScrapTimestamps(prev => ({ ...prev, ...tsMap }));
    } catch (error: any) {
      setScrapsError(error.message || t('scrapPage_loadScrapsError'));

      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setScrapsLoading(false);
    }
  }, [isAuthenticated, t]);


  // 인증 상태 확인
  const checkAuthStatus = useCallback(async () => {
    try {
      const result = await browser.storage.local.get(['authState']);
      const authState = result.authState;
      const hasToken = !!(authState?.accessToken && authState?.isAuthenticated);
      setIsAuthenticated(hasToken);
      setAuthChecked(true);
      
      // console.log('🔐 Auth status:', { 
      //   hasToken, 
      //   isAuthenticated: authState?.isAuthenticated,
      //   hasAccessToken: !!authState?.accessToken,
      //   user: authState?.user?.email 
      // });
    } catch (error) {
      // console.error('❌ Auth check error:', error);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  }, []);

  // 웹 클리핑 기능
  const handleClipCurrentPage = useCallback(async () => {
    if (isClipping) return;

    try {
      setIsClipping(true);
      setClipStatus('loading');

      // 공통 헬퍼를 통해 스크랩 처리
      await clipAndScrapCurrentPage();

      // console.log('✅ 스크랩 완료');
      setClipStatus('success');
      showSuccess(t('scrapPage_scrapSuccess'), t('scrapPage_scrapSuccess'));

      // 스크랩 목록 새로고침 (첫 페이지부터)
      setCurrentPage(1);
      setHasMore(true);
      await loadScraps(1, false);

      // 성공 상태 2초 후 리셋
      setTimeout(() => setClipStatus('idle'), 2000);
      
    } catch (error: any) {
      console.error('❌ 스크랩 실패:', error);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        showError(t('common_error'), t('scrapPage_authExpired'));
      } else {
        showError(t('scrapPage_failed'), error.message || t('scrapPage_scrapFailed'));
      }
      
      setClipStatus('error');
      
      // 에러 상태 3초 후 리셋
      setTimeout(() => setClipStatus('idle'), 3000);
    } finally {
      setIsClipping(false);
    }
  }, [isClipping, selectedTags, loadScraps, showSuccess, showError]);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);
  
  // 인증 상태가 변경되면 목록 로드
  useEffect(() => {
    if (!isAuthenticated || !authChecked) {
      setScraps([]);
      setCurrentPage(1);
      setHasMore(true);
      return;
    }
    // 첫 페이지부터 로드
    loadScraps(1, false);
  }, [isAuthenticated, authChecked]);

  // 페이지 visibility 변경 시 스크랩 목록 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && authChecked) {
        setCurrentPage(1);
        setHasMore(true);
        loadScraps(1, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, authChecked]);

  // Background script로부터 스크랩 생성 알림 수신
  useEffect(() => {
    let isActive = true;

    const handleScrapCreatedMessage = (message: any) => {
      if (isActive && message.action === 'scrapCreated' && isAuthenticated) {
        // 새 스크랩 추가 시 첫 페이지 새로고침
        setCurrentPage(1);
        setHasMore(true);
        loadScraps(1, false);
      }
    };

    browser.runtime.onMessage.addListener(handleScrapCreatedMessage);

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  // 스크랩에 태그 추가
  const handleAddTag = useCallback(async (scrapId: string, tag: string) => {
    if (!tag.trim() || isAddingTag) {
      return;
    }

    // 중복 태그 확인
    const currentScrap = scraps.find(scrap => scrap.id === scrapId);
    if (currentScrap && currentScrap.tags.includes(tag.trim())) {
      // alert(`"${tag.trim()}" 태그가 이미 존재합니다.`);
      return;
    }

    try {
      setIsAddingTag(true);
      // console.log('🏷️ Adding tag:', tag, 'to scrap:', scrapId);
      
      // 서버 API 호출하여 태그 추가
      await scrapService.addTagToScrap(parseInt(scrapId), tag.trim());
      
      // console.log('✅ Tag added successfully');
      
      // 스크랩 목록 새로고침하여 새 태그 반영
      await loadScraps();
      
      setActiveInputId(null);
      
    } catch (error: any) {
      // console.error('❌ Failed to add tag:', error);
      
      // 사용자에게 에러 알림
      showError(t('scrapPage_tagAddFailed'), `${error.message || t('scrapPage_unknownError')}`);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsAddingTag(false);
    }
  }, [loadScraps, isAddingTag, scraps]);

  // 스크랩에서 태그 삭제
  const handleRemoveTag = useCallback(async (scrapId: string, tagName: string) => {
    try {
      // console.log('🗑️ Removing tag:', tagName, 'from scrap:', scrapId);
      
      // 현재 스크랩에서 해당 태그의 tagId 찾기
      const currentScrap = scraps.find(scrap => scrap.id === scrapId);
      if (!currentScrap) {
        throw new Error(t('scrapPage_scrapNotFound'));
      }

      // 실제 태그 객체에서 tagId를 찾기 위해 서버에서 태그 정보 조회
      const scrapTags = await scrapService.getScrapTags(parseInt(scrapId));
      const tagToRemove = scrapTags.find(tag => tag.name === tagName);
      
      if (!tagToRemove) {
        throw new Error(t('scrapPage_tagNotFound'));
      }
      
      // 서버 API 호출하여 태그 삭제
      await scrapService.removeTagFromScrap(parseInt(scrapId), tagToRemove.tagId);
      
      // console.log('✅ Tag removed successfully');
      
      // 스크랩 목록 새로고침하여 태그 삭제 반영
      await loadScraps();
      
    } catch (error: any) {
      // console.error('❌ Failed to remove tag:', error);
      
      // 사용자에게 에러 알림
      showError(t('scrapPage_tagRemoveFailed'), `${error.message || t('scrapPage_unknownError')}`);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    }
  }, [scraps, loadScraps]);


  // Handle scrap delete with undo pattern
  const handleDeleteScrap = (scrapId: string) => {
    // If there's already a pending delete, complete it immediately
    if (pendingDeleteId !== null && deleteTimeoutId) {
      clearTimeout(deleteTimeoutId);
      executeDeleteScrap(pendingDeleteId);
    }

    // Find and store the scrap to be deleted
    const scrapToDelete = scraps.find(scrap => scrap.id === scrapId);
    if (!scrapToDelete) return;

    // Mark as pending delete and remove from UI immediately
    setPendingDeleteId(scrapId);
    setDeletedScrap(scrapToDelete);
    setScraps(scraps.filter(scrap => scrap.id !== scrapId));

    // Show success toast with undo information
    showSuccess(
      t('scrapPage_deleteScrapSuccessUndo'),
      t('scrapPage_undoMessage'),
      6000 // 6 seconds to see the message
    );

    // Set timeout to actually delete after 5 seconds
    const timeoutId = setTimeout(() => {
      executeDeleteScrap(scrapId);
    }, 5000);

    setDeleteTimeoutId(timeoutId);
  };

  const handleUndoDeleteScrap = () => {
    if (pendingDeleteId && deleteTimeoutId && deletedScrap) {
      clearTimeout(deleteTimeoutId);
      setDeleteTimeoutId(null);

      // Restore the scrap to the list in the correct position
      setScraps(prevScraps => {
        const restored = [...prevScraps, deletedScrap];
        // Sort by timestamp (newest first)
        return restored.sort((a, b) => {
          const aTime = scrapTimestamps[a.id] || new Date(a.date).getTime();
          const bTime = scrapTimestamps[b.id] || new Date(b.date).getTime();
          return bTime - aTime;
        });
      });

      setPendingDeleteId(null);
      setDeletedScrap(null);
      showSuccess(t('scrapPage_undoSuccess'), '', 3000);
    }
  };

  const executeDeleteScrap = async (scrapId: string) => {
    try {
      await scrapService.deleteScrap(parseInt(scrapId));
      setPendingDeleteId(null);
      setDeletedScrap(null);
      setDeleteTimeoutId(null);
    } catch (err: any) {
      // If delete fails, restore the scrap
      if (deletedScrap) {
        setScraps(prevScraps => {
          const restored = [...prevScraps, deletedScrap];
          // Sort by timestamp (newest first)
          return restored.sort((a, b) => {
            const aTime = scrapTimestamps[a.id] || new Date(a.date).getTime();
            const bTime = scrapTimestamps[b.id] || new Date(b.date).getTime();
            return bTime - aTime;
          });
        });
      }
      setPendingDeleteId(null);
      setDeletedScrap(null);
      setDeleteTimeoutId(null);
      showError(t('scrapPage_deleteScrapFailed'), err.message || t('scrapPage_deleteScrapError'));
    }
  };

  // 키보드 입력 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, scrapId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagValue = e.currentTarget.value.trim();
      if (tagValue) {
        handleAddTag(scrapId, tagValue);
        e.currentTarget.value = ''; // 입력 필드 초기화
      }
    } else if (e.key === 'Escape') {
      setActiveInputId(null);
      e.currentTarget.value = ''; // 입력 필드 초기화
    }
  }, [handleAddTag]);


  // 스크랩 목록 새로고침
  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated || isRefreshing) return;

    try {
      setIsRefreshing(true);
      // 첫 페이지부터 다시 로드
      setCurrentPage(1);
      setHasMore(true);
      await loadScraps(1, false);
      showSuccess(t('common_success'), t('scrapPage_listRefreshSuccess'));
    } catch (error: any) {
      showError(t('common_error'), error.message || t('scrapPage_listRefreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, isRefreshing, loadScraps, showSuccess, showError, t]);

  // ref를 통해 refreshList 함수 노출
  useImperativeHandle(ref, () => ({
    refreshList: handleRefresh
  }));

  // PDF 업로드 성공 시 처리
  const handlePDFUploadSuccess = useCallback(() => {
    // 업로드 성공 시 스크랩 목록을 갱신 (v3 API는 webclip + upload 통합)
    setCurrentPage(1);
    setHasMore(true);
    loadScraps(1, false);
  }, [loadScraps]);

  // 태그 필터 적용된 스크랩 목록 (v3 API는 webclip + upload 통합)
  const filteredItems = useMemo(() => {
    return filteredScraps.map(s => ({
      type: 'SCRAP' as const,
      key: `scrap-${s.id}`,
      scrap: s,
    }));
  }, [filteredScraps]);

  // 로그인 페이지로 이동 (또는 로그아웃 처리)
  const handleLogin = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await logout();
        showSuccess(t('menu_signOut'), t('scrapPage_logoutSuccess'));
      } catch (error) {
        showError(t('menu_signOut'), t('scrapPage_logoutFailed'));
      }
    } else {
      showWarning(t('scrapPage_loginRequired'), t('scrapPage_loginWarning'));
    }
  }, [isAuthenticated, logout]);

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

  // 무한스크롤 IntersectionObserver 설정
  useEffect(() => {
    // 로딩 중이거나 더 이상 데이터가 없으면 중단
    if (scrapsLoading || !hasMore || !isAuthenticated) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !scrapsLoading) {
          // 다음 페이지 로드
          loadScraps(currentPage + 1, true);
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
    };
  }, [scrapsLoading, hasMore, currentPage, loadScraps, isAuthenticated]);



  const openScrapInNewTab = useCallback(async (scrapId: string, scrapType?: 'webclip' | 'pdf' | 'image' | 'video' | 'audio' | 'upload') => {
    // console.log('🚀 ScrapPage: Opening viewer for ID:', scrapId, 'type:', scrapType);
    try {
      // v3 API에서 type 구분: webclip은 SCRAP, 파일 기반은 UPLOAD
      // pdf, image, video, audio, upload -> UPLOAD viewer
      const viewerType = scrapType === 'webclip' ? 'SCRAP' : 'UPLOAD';
      const url = browser.runtime.getURL(`/webviewer.html#type=${viewerType}&id=${scrapId}`);
      // console.log('📝 ScrapPage: Generated viewer URL:', url);

      const message = {
        action: 'openViewer',
        url: url,
        type: viewerType,
        id: scrapId
      };
      // console.log('📤 ScrapPage: Sending message to background:', message);

      const response = await browser.runtime.sendMessage(message);
      // console.log('📥 ScrapPage: Received response from background:', response);

      if (!response) {
        console.error('❌ ScrapPage: No response received from background');
        throw new Error('No response from background script');
      }

      if (!response.success) {
        console.error('❌ ScrapPage: Background returned error:', response.error);
        throw new Error(response.error || 'Failed to open viewer');
      }

      // console.log('✅ ScrapPage: Successfully opened viewer');
    } catch (e) {
      console.error('❌ ScrapPage: Failed to open viewer:', e);
      showError(t('common_error'), t('scrapPage_openViewerError'));
    }
  }, [showError, t]);

  // Helper function to get icon based on scrap type
  const getScrapIcon = (scrap: Scrap) => {
    // For webclips, show favicon or link icon
    if (scrap.type === 'webclip') {
      return scrap.faviconUrl ? (
        <img
          src={scrap.faviconUrl}
          alt="Site favicon"
          style={{
            width: 16,
            height: 16,
            marginRight: 6,
            verticalAlign: 'text-bottom',
            flexShrink: 0
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallbackIcon = target.nextElementSibling as HTMLElement;
            if (fallbackIcon) {
              fallbackIcon.style.display = 'inline';
            }
          }}
        />
      ) : (
        <LuLink
          size={16}
          style={{
            marginRight: 6,
            verticalAlign: 'text-bottom',
            flexShrink: 0
          }}
        />
      );
    }

    // For uploads, show appropriate file type icon
    // Note: scrap.type from server can be 'pdf', 'image', 'video', 'audio', 'upload'
    const IconComponent = (() => {
      const typeStr = String(scrap.type || '').toLowerCase();
      if (typeStr === 'pdf') return LuFileText;
      if (typeStr === 'image') return LuImage;
      if (typeStr === 'video') return LuVideo;
      if (typeStr === 'audio') return LuMusic;
      return LuFile; // Default for 'upload' or unknown
    })();

    return (
      <IconComponent
        size={16}
        style={{
          marginRight: 6,
          verticalAlign: 'text-bottom',
          flexShrink: 0
        }}
      />
    );
  };

  const ScrapItem = React.memo<{ scrap: Scrap; onDelete: () => void }>(({ scrap, onDelete }) => {
    return (
      <div
        className={styles.contentItem}
        data-url={scrap.url}
        onClick={() => openScrapInNewTab(scrap.id, scrap.type)}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.contentHeader}>
          <div className={styles.contentTitleWrapper}>
            {getScrapIcon(scrap)}
            <span className={styles.titleText}>
              <a href={scrap.url} target="_blank" rel="noopener noreferrer" className={styles.contentTitleLink} onClick={(e) => e.stopPropagation()}>
                {scrap.title}
              </a>
            </span>
          </div>
          <Tooltip content={t('common_delete')} side='bottom'>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={styles.deleteButton}>
              <IoTrash />
            </button>
          </Tooltip>
        </div>
        <div className={styles.contentDescription}>
          {scrap.content}
        </div>
        <div className={styles.contentFooter}>
          <div className={styles.tags}>
            <button
              className={styles.addTagButton}
              onClick={(e) => {
                e.stopPropagation();
                setActiveInputId(activeInputId === scrap.id ? null : scrap.id);
                setShowAllTags(null);
              }}
            >
              <IoAdd size={14} />
            </button>
            <TagList
              tags={scrap.tags}
              onTagRemove={(tagName) => handleRemoveTag(scrap.id, tagName)}
              showRemoveButton={true}
            />
            {activeInputId === scrap.id && (
              <div
                className={styles.tagInputTooltip}
                data-tooltip-id={scrap.id}
              >
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={(e) => handleKeyDown(e, scrap.id)}
                  placeholder={t('scrapPage_tagPlaceholder')}
                  className={styles.tagInput}
                  autoFocus
                />
                <button
                  className={styles.tagSubmitButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    const inputElement = inputRef.current;
                    if (inputElement) {
                      const tagValue = inputElement.value.trim();
                      if (tagValue) {
                        handleAddTag(scrap.id, tagValue);
                        inputElement.value = ''; // 입력 필드 초기화
                      }
                    }
                  }}
                >
                  {t('common_confirm')}
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
    <div className={layoutStyles.pageLayout}>
      <div className={styles.fixedContent}>
        <div className={styles.addButtonContainer}>
          {!authChecked ? (
            <div className={styles.loadingAuth}>{t('scrapPage_authCheckingStatus')}</div>
          ) : !isAuthenticated ? (
            <div className={styles.authRequired}>
              <div className={styles.authMessage}>
                {t('scrapPage_loginRequired')}
              </div>
              <button 
                className={`${styles.addButton} ${styles.loginButton}`}
                onClick={handleLogin}
              >
                {t('scrapPage_loginGuide')}
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
                    {t('scrapPage_saved')}
                  </>
                ) : clipStatus === 'error' ? (
                  <>
                    <IoClose size={20} />
                    {t('scrapPage_failed')}
                  </>
                ) : clipStatus === 'loading' || isClipping ? (
                  <>
                    <FaBookmark size={18} />
                    {t('scrapPage_clipping')}
                  </>
                ) : (
                  <>
                    <FaBookmark size={18} />
                    {t('scrapPage_pageScrap')}
                  </>
                )}
              </button>
              
              <button
                className={`${styles.addButton} ${scrapStyles.pdfUploadButton}`}
                onClick={async () => {
                  setShowPDFUploadModal(true);
                  try {
                    await trackPDFUploadModalOpenedBridge({
                      from: 'scrap_page',
                      existing_uploads_count: 0 // v3 API에서 upload는 scraps에 통합됨
                    })
                  } catch {}
                }}
              >
                <IoDocument size={20} />
                {t('scrapPage_pdf')}
              </button>
            </div>
          )}
        </div>


        <div className={styles.headerControls}>
          <TagSelector
            availableTags={allTags}
            selectedTags={selectedTags}
            onTagSelect={(tag) => setSelectedTags(prev =>
              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )}
            onTagRemove={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
          />
        </div>
      </div>

      <div className={layoutStyles.scrollableContent}>
        <div className={styles.scrapList}>
          {(() => {
            const isInitialLoading = scrapsLoading && filteredItems.length === 0;
            const hasError = !!scrapsError;
            if (isInitialLoading) {
              return (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingIndicator}>{t('scrapPage_loadingList')}</div>
                </div>
              );
            }
            if (hasError && filteredItems.length === 0) {
              return (
                <div className={styles.errorContainer}>
                  <div className={styles.errorMessage}>{scrapsError}</div>
                  <button className={styles.retryButton} onClick={handleRefresh}>{t('scrapPage_retryButton')}</button>
                </div>
              );
            }
            if (filteredItems.length === 0) {
              return (
                <div className={styles.emptyContainer}>
                  <div className={styles.emptyMessage}>{t('scrapPage_emptyMessage')}</div>
                </div>
              );
            }
            return filteredItems.map((item, index) => {
              const scrap = item.scrap;
              const isLastScrap = index === filteredItems.length - 1;
              return (
                <div key={item.key} ref={isLastScrap ? lastScrapRef : null}>
                  <ScrapItem
                    scrap={scrap}
                    onDelete={() => handleDeleteScrap(scrap.id)}
                  />
                </div>
              );
            });
          })()}
        </div>
        {scrapsLoading && hasMore && scraps.length > 0 && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIndicator}>
              Loading more...
            </div>
          </div>
        )}
      </div>

      {/* Floating Undo Button */}
      {pendingDeleteId && (
        <div className={styles.undoContainer}>
          <button
            className={styles.undoButton}
            onClick={handleUndoDeleteScrap}
            aria-label={t('scrapPage_undo')}
          >
            {t('scrapPage_undo')}
          </button>
        </div>
      )}

      {/* PDF Upload Modal */}
      <PDFUploadModal
        isOpen={showPDFUploadModal}
        onClose={() => setShowPDFUploadModal(false)}
        onUploadSuccess={handlePDFUploadSuccess}
      />
    </div>
  );
});

export default ScrapPage; 
