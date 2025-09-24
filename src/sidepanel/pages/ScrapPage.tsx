import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IoAdd, IoTrash, IoClose, IoClipboard, IoCheckmark, IoRefresh, IoDocument, IoLink } from 'react-icons/io5';
import { browser } from 'wxt/browser';
import styles from './PageStyles.module.css';
import scrapStyles from './ScrapPage.module.css';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { scrapService } from '../../services/scrapService';
import { useToastHelpers } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import { Scrap } from '../../types/scrap.d';
import { clipAndScrapCurrentPage, ScrapStatus } from '../../utils/scrapHelper';
import { markdownToPlainTextPreview } from '../../utils/markdownConverter';
import Tooltip from '../../components/common/Tooltip';
import { PDFUploadModal } from '../../components/sidepanel/PDFUploadModal/PDFUploadModal';
import { libraryItemService, type LibraryItemDto } from '../../services/libraryItemService';
import { globalApiClient } from '../../services/globalApiClient';
import { trackPDFUploadModalOpenedBridge } from '../../analytics/bridge';

const ScrapPage: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToastHelpers();
  const { logout } = useAuth();
  const { t } = useI18n();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [uploads, setUploads] = useState<LibraryItemDto[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  // createdAt timestamp map for scraps (ms since epoch)
  const [scrapTimestamps, setScrapTimestamps] = useState<Record<string, number>>({});
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPDFUploadModal, setShowPDFUploadModal] = useState(false);

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

  // 스크랩 목록 불러오기
  const loadScraps = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // console.log('🔄 Loading scraps...');
      setScrapsLoading(true);
      setScrapsError(null);
      
      const scrapList = await scrapService.getScraps();
      // console.log('📋 Loaded scraps:', scrapList.length, 'items');
      
      // ScrapResponse를 Scrap 형태로 변환
      const convertedScraps: Scrap[] = scrapList.map(scrap => ({
        id: scrap.scrapId.toString(),
        title: scrap.title,
        content: scrap.contentInfo?.text || scrap.content, // contentInfo.text 우선, 없으면 content 폴백
        url: scrap.url,
        date: new Date(scrap.createdAt).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        tags: scrap.tags ? scrap.tags.map(tag => tag.name) : [], // 태그 객체에서 name만 추출
      }));
      
      setScraps(convertedScraps);
      // createdAt 타임스탬프 저장 (정렬용)
      const tsMap: Record<string, number> = {};
      for (const s of scrapList) {
        tsMap[s.scrapId.toString()] = new Date(s.createdAt).getTime();
      }
      setScrapTimestamps(tsMap);
      // console.log('✅ Scraps state updated with', convertedScraps.length, 'items');
    } catch (error: any) {
      // console.error('❌ Failed to load scraps:', error);
      setScrapsError(error.message || t('scrapPage_loadScrapsError'));
      
      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setScrapsLoading(false);
    }
  }, [isAuthenticated]);

  // 업로드 목록 불러오기
  const loadUploads = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUploadsLoading(true);
      setUploadsError(null);
      const items = await libraryItemService.list('UPLOAD');
      setUploads(items);
    } catch (error: any) {
      setUploadsError(error.message || t('scrapPage_loadUploadsError'));
      if (error.message?.includes('Authentication')) setIsAuthenticated(false);
    } finally {
      setUploadsLoading(false);
    }
  }, [isAuthenticated]);

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
      const scrapResponse = await clipAndScrapCurrentPage();

      // console.log('✅ 스크랩 완료:', scrapResponse);
      setClipStatus('success');
      showSuccess(t('scrapPage_scrapSuccess'), t('scrapPage_scrapSuccess'));
      
      // 스크랩 목록 새로고침
      await loadScraps();
      
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
      setUploads([]);
      return;
    }
    // 둘 다 로드
    loadScraps();
    loadUploads();
  }, [isAuthenticated, authChecked, loadScraps, loadUploads]);

  // 페이지 visibility 변경 시 스크랩 목록 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && authChecked) {
        loadScraps();
        loadUploads();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, authChecked, loadScraps, loadUploads]);

  // Background script로부터 스크랩 생성 알림 수신
  useEffect(() => {
    let isActive = true;
    
    const handleScrapCreatedMessage = (message: any) => {
      if (isActive && message.action === 'scrapCreated' && isAuthenticated) {
        loadScraps();
      }
    };

    browser.runtime.onMessage.addListener(handleScrapCreatedMessage);
    
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, loadScraps]);

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

  // 업로드에 태그 추가
  const handleAddUploadTag = useCallback(async (itemId: number, tag: string) => {
    if (!tag.trim() || isAddingTag) return;
    try {
      setIsAddingTag(true);
      await libraryItemService.addTag(itemId, 'UPLOAD', tag.trim());
      await loadUploads();
      setActiveInputId(null);
    } catch (error: any) {
      showError(t('scrapPage_tagAddFailed'), `${error.message || t('scrapPage_unknownError')}`);
      if (error.message?.includes('Authentication')) setIsAuthenticated(false);
    } finally {
      setIsAddingTag(false);
    }
  }, [isAddingTag, loadUploads, showError]);

  // 업로드에서 태그 삭제
  const handleRemoveUploadTag = useCallback(async (itemId: number, tagName: string) => {
    try {
      const tags = await libraryItemService.getTags(itemId, 'UPLOAD');
      const tag = tags.find(t => t.name === tagName);
      if (!tag) throw new Error(t('scrapPage_tagNotFound'));
      await libraryItemService.removeTag(itemId, 'UPLOAD', tag.tagId);
      await loadUploads();
    } catch (error: any) {
      showError(t('scrapPage_tagRemoveFailed'), `${error.message || t('scrapPage_unknownError')}`);
      if (error.message?.includes('Authentication')) setIsAuthenticated(false);
    }
  }, [loadUploads, showError]);

  // 업로드 태그 입력 키 핸들러
  const handleUploadKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, itemId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagValue = e.currentTarget.value.trim();
      if (tagValue) {
        handleAddUploadTag(itemId, tagValue);
        e.currentTarget.value = '';
      }
    } else if (e.key === 'Escape') {
      setActiveInputId(null);
      e.currentTarget.value = '';
    }
  }, [handleAddUploadTag]);

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
      await Promise.all([loadScraps(), loadUploads()]);
      showSuccess(t('common_success'), t('scrapPage_listRefreshSuccess'));
    } catch (error: any) {
      showError(t('common_error'), error.message || t('scrapPage_listRefreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, isRefreshing, loadScraps, loadUploads, showSuccess, showError]);

  // PDF 업로드 성공 시 처리
  const handlePDFUploadSuccess = useCallback(() => {
    // 업로드 성공 시 업로드 목록을 갱신
    loadUploads();
  }, [loadUploads]);

  // 스크랩과 업로드를 합친 통합 목록 (최신순)
  const combinedItems = useMemo(() => {
    type Combined = { type: 'SCRAP' | 'UPLOAD'; ts: number; key: string; scrap?: Scrap; upload?: LibraryItemDto };
    const items: Combined[] = [];
    // 스크랩: 태그 필터 적용된 것만 포함
    for (const s of filteredScraps) {
      const ts = scrapTimestamps[s.id] ?? new Date(s.date).getTime();
      items.push({ type: 'SCRAP', ts, key: `scrap-${s.id}`, scrap: s });
    }
    // 업로드: 항상 포함
    for (const u of uploads) {
      const ts = u.createdAt ? new Date(u.createdAt).getTime() : 0;
      items.push({ type: 'UPLOAD', ts, key: `upload-${u.id}`, upload: u });
    }
    return items.sort((a, b) => b.ts - a.ts);
  }, [filteredScraps, uploads, scrapTimestamps]);

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

  // 불필요한 useEffect 제거 (inputRef.current?.focus())

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
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
  }, [loading]);



  const openScrapInNewTab = useCallback(async (scrapId: string) => {
    try {
      const url = browser.runtime.getURL(`/webviewer.html#type=SCRAP&id=${scrapId}`);
      await browser.tabs.create({ url });
    } catch (e) {
      showError(t('common_error'), t('scrapPage_openViewerError'));
    }
  }, [showError]);

  const ScrapItem = React.memo<{ scrap: Scrap; onDelete: () => void }>(({ scrap, onDelete }) => {
    return (
      <div 
        className={styles.contentItem} 
        data-url={scrap.url}
        onClick={() => openScrapInNewTab(scrap.id)}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.contentHeader}>
          <div className={styles.contentTitleWrapper}>
            <IoLink size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
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

  const openUploadInNewTab = useCallback(async (uploadedId: number) => {
    try {
      const url = browser.runtime.getURL(`/webviewer.html#type=UPLOAD&id=${uploadedId}`);
      await browser.tabs.create({ url });
    } catch (e) {
      showError(t('common_error'), t('scrapPage_openUploadViewerError'));
    }
  }, [showError]);

  return (
    <div className={styles.pageContainer}>
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
                    <IoClipboard size={20} />
                    {t('scrapPage_clipping')}
                  </>
                ) : (
                  <>
                    <IoClipboard size={20} />
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
                      existing_uploads_count: uploads.length
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
          {isAuthenticated && (
            <Tooltip content={t('scrapPage_refreshTooltip')} side='bottom'>
              <button
                className={`${styles.refreshButton} ${isRefreshing ? styles.loading : ''}`}
                onClick={handleRefresh}
                disabled={isRefreshing}
                >
                <IoRefresh size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className={styles.scrollableContent}>
        <div className={styles.scrapList}>
          {(() => {
            const isInitialLoading = (scrapsLoading || uploadsLoading) && combinedItems.length === 0;
            const hasError = !!scrapsError || !!uploadsError;
            if (isInitialLoading) {
              return (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingIndicator}>{t('scrapPage_loadingList')}</div>
                </div>
              );
            }
            if (hasError && combinedItems.length === 0) {
              return (
                <div className={styles.errorContainer}>
                  <div className={styles.errorMessage}>
                    {scrapsError || uploadsError}
                  </div>
                  <button className={styles.retryButton} onClick={handleRefresh}>{t('scrapPage_retryButton')}</button>
                </div>
              );
            }
            if (combinedItems.length === 0) {
              return (
                <div className={styles.emptyContainer}>
                  <div className={styles.emptyMessage}>{t('scrapPage_emptyMessage')}</div>
                </div>
              );
            }
            return combinedItems.map((item) => {
              if (item.type === 'SCRAP' && item.scrap) {
                const scrap = item.scrap;
                return (
                  <ScrapItem
                    key={item.key}
                    scrap={scrap}
                    onDelete={async () => {
                      try {
                        await scrapService.deleteScrap(parseInt(scrap.id));
                        await loadScraps();
                        showSuccess(t('common_delete'), t('scrapPage_deleteScrapSuccess'));
                      } catch (error: any) {
                        showError(t('common_delete'), error?.message || t('scrapPage_deleteScrapFailed'));
                      }
                    }}
                  />
                );
              }
              if (item.type === 'UPLOAD' && item.upload) {
                const u = item.upload;
                return (
                  <div
                    key={item.key}
                    className={styles.contentItem}
                    onClick={() => openUploadInNewTab(u.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.contentHeader}>
                      {u.url ? (
                        <div className={styles.contentTitleWrapper}>
                          <IoDocument size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                          <span className={styles.titleText}>
                            <a href={u.url} target="_blank" rel="noreferrer" className={styles.contentTitleLink} onClick={(e) => e.stopPropagation()}>
                              {u.title}
                            </a>
                          </span>
                        </div>
                      ) : (
                        <div className={styles.contentTitleWrapper}>
                          <IoDocument size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                          <span className={styles.titleText}>{u.title}</span>
                        </div>
                      )}
                      <Tooltip content={t('common_delete')} side='bottom'>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            // 낙관적 업데이트: 즉시 UI에서 항목 제거
                            const prevUploads = uploads;
                            setUploads((curr) => curr.filter((it) => it.id !== u.id));
                            try {
                              await globalApiClient.delete(`/v1/uploaded-files/${u.id}`);
                              showSuccess(t('common_delete'), t('scrapPage_deleteUploadSuccess'));
                              // 백그라운드에서 최신 목록 동기화
                              // void loadUploads();
                            } catch (e: any) {
                              // 실패 시 롤백
                              setUploads(prevUploads);
                              showError(t('common_delete'), e?.message || t('scrapPage_deleteUploadFailed'));
                            }
                          }}
                          className={styles.deleteButton}
                        >
                          <IoTrash />
                        </button>
                      </Tooltip>
                    </div>
                    <div className={styles.contentDescription}>{u.previewText || u.description || ''}</div>
                    <div className={styles.contentFooter}>
                      <div className={styles.tags}>
                        <button 
                          className={styles.addTagButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            const key = `upload-${u.id}`;
                            setActiveInputId(activeInputId === key ? null : key);
                            setShowAllTags(null);
                          }}
                        >
                          <IoAdd size={14} />
                        </button>
                        <TagList 
                          tags={u.tags || []}
                          maxVisibleTags={2}
                          onTagRemove={(tagName) => handleRemoveUploadTag(u.id, tagName)}
                          showRemoveButton={true}
                        />
                        {activeInputId === `upload-${u.id}` && (
                          <div 
                            className={styles.tagInputTooltip} 
                            data-tooltip-id={`upload-${u.id}`}
                          >
                            <input
                              ref={inputRef}
                              type="text"
                              onKeyDown={(e) => handleUploadKeyDown(e, u.id)}
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
                                    handleAddUploadTag(u.id, tagValue);
                                    inputElement.value = '';
                                  }
                                }
                              }}
                            >
                              {t('scrapPage_add')}
                            </button>
                          </div>
                        )}
                      </div>
                      {u.createdAt && (
                        <div className={styles.contentDate}>
                          {new Date(u.createdAt).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            });
          })()}
        </div>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIndicator}>
              Loading...
            </div>
          </div>
        )}
      </div>

      {/* PDF Upload Modal */}
      <PDFUploadModal
        isOpen={showPDFUploadModal}
        onClose={() => setShowPDFUploadModal(false)}
        onUploadSuccess={handlePDFUploadSuccess}
      />
    </div>
  );
};

export default ScrapPage; 
