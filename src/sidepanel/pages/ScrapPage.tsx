import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IoAdd, IoTrash, IoClose, IoClipboard, IoCheckmark, IoRefresh, IoDocument, IoCloudUpload } from 'react-icons/io5';
import { browser } from 'wxt/browser';
import styles from './PageStyles.module.css';
import scrapStyles from './ScrapPage.module.css';
import { TagSelector } from '../../components/sidepanel/TagSelector/TagSelector';
import { TagList } from '../../components/sidepanel/TagList/TagList';
import { scrapService } from '../../services/scrapService';
import { useToastHelpers } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Scrap } from '../../types/scrap.d';
import { clipAndScrapCurrentPage, ScrapStatus } from '../../utils/scrapHelper';
import { markdownToPlainTextPreview } from '../../utils/markdownConverter';
import Tooltip from '../../components/common/Tooltip';

const ScrapPage: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToastHelpers();
  const { logout } = useAuth();
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
  const observerRef = useRef<IntersectionObserver>();
  const lastScrapRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
        content: scrap.content,
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
      // console.log('✅ Scraps state updated with', convertedScraps.length, 'items');
    } catch (error: any) {
      // console.error('❌ Failed to load scraps:', error);
      setScrapsError(error.message || '스크랩을 불러오는데 실패했습니다.');
      
      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setScrapsLoading(false);
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
      showSuccess('페이지 스크랩 완료', '페이지가 성공적으로 저장되었습니다.');
      
      // 스크랩 목록 새로고침
      await loadScraps();
      
      // 성공 상태 2초 후 리셋
      setTimeout(() => setClipStatus('idle'), 2000);
      
    } catch (error: any) {
      console.error('❌ 스크랩 실패:', error);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        showError('인증 만료', '로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else {
        showError('스크랩 실패', error.message || '페이지 스크랩 중 오류가 발생했습니다.');
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
  
  // 인증 상태가 변경되면 스크랩 목록 로드
  useEffect(() => {
    if (isAuthenticated && authChecked) {
      loadScraps();
    } else {
      setScraps([]);
    }
  }, [isAuthenticated, authChecked, loadScraps]);

  // 페이지 visibility 변경 시 스크랩 목록 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && authChecked) {
        // console.log('📱 Side panel visible, refreshing scraps...');
        loadScraps();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, authChecked, loadScraps]);

  // Background script로부터 스크랩 생성 알림 수신
  useEffect(() => {
    let isActive = true;
    
    const handleScrapCreatedMessage = (message: any) => {
      if (isActive && message.action === 'scrapCreated' && isAuthenticated) {
        // console.log('📱 Scrap created notification received, refreshing list...');
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
      showError('태그 추가 실패', `${error.message || '알 수 없는 오류'}`);
      
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
        throw new Error('스크랩을 찾을 수 없습니다.');
      }

      // 실제 태그 객체에서 tagId를 찾기 위해 서버에서 태그 정보 조회
      const scrapTags = await scrapService.getScrapTags(parseInt(scrapId));
      const tagToRemove = scrapTags.find(tag => tag.name === tagName);
      
      if (!tagToRemove) {
        throw new Error('삭제할 태그를 찾을 수 없습니다.');
      }
      
      // 서버 API 호출하여 태그 삭제
      await scrapService.removeTagFromScrap(parseInt(scrapId), tagToRemove.tagId);
      
      // console.log('✅ Tag removed successfully');
      
      // 스크랩 목록 새로고침하여 태그 삭제 반영
      await loadScraps();
      
    } catch (error: any) {
      // console.error('❌ Failed to remove tag:', error);
      
      // 사용자에게 에러 알림
      showError('태그 삭제 실패', `${error.message || '알 수 없는 오류'}`);
      
      // 인증 에러인 경우 인증 상태 재확인
      if (error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    }
  }, [scraps, loadScraps]);

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
      await loadScraps();
      showSuccess('새로고침 완료', '스크랩 목록이 업데이트되었습니다.');
    } catch (error: any) {
      showError('새로고침 실패', error.message || '스크랩 목록 새로고침에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, isRefreshing, loadScraps, showSuccess, showError]);

  // PDF 파일 업로드 핸들러
  const handlePDFUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    // PDF 파일 검증
    if (file.type !== 'application/pdf') {
      showError('파일 형식 오류', 'PDF 파일만 업로드 가능합니다.');
      return;
    }
    
    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('파일 크기 초과', '10MB 이하의 파일만 업로드 가능합니다.');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // TODO: 실제 UploadThing 서비스 연동
      // const uploadResult = await uploadFiles([file]);
      
      // 임시 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccess('업로드 완료', `${file.name}이 성공적으로 업로드되었습니다.`);
      setShowUploadArea(false);
      await loadScraps();
      
    } catch (error: any) {
      console.error('PDF upload error:', error);
      showError('업로드 실패', error.message || 'PDF 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [showSuccess, showError, loadScraps]);

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (!pdfFile) {
      showError('파일 형식 오류', 'PDF 파일만 업로드 가능합니다.');
      return;
    }
    
    await handlePDFUpload(pdfFile);
  }, [handlePDFUpload, showError]);

  // 로그인 페이지로 이동 (또는 로그아웃 처리)
  const handleLogin = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await logout();
        showSuccess('로그아웃', '성공적으로 로그아웃되었습니다.');
      } catch (error) {
        showError('로그아웃 실패', '로그아웃 처리 중 오류가 발생했습니다.');
      }
    } else {
      showWarning('로그인 필요', 'Tyquill에 로그인하여 스크랩 기능을 사용하세요.');
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



  const ScrapItem = React.memo<{ scrap: Scrap; onDelete: () => void }>(({ scrap, onDelete }) => {
    return (
      <div className={styles.contentItem} data-url={scrap.url}>
        <div className={styles.contentHeader}>
          <a href={scrap.url} target="_blank" rel="noopener noreferrer" className={styles.contentTitle}>
            {scrap.title}
          </a>
          <Tooltip content="삭제" side='bottom'>
            <button onClick={onDelete} className={styles.deleteButton}>
              <IoTrash />
            </button>
          </Tooltip>
        </div>
        <div className={styles.contentDescription}>
          {markdownToPlainTextPreview(scrap.content)}
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
                  placeholder="태그 입력 후 Enter"
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
                ) : clipStatus === 'loading' || isClipping ? (
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
                className={`${styles.addButton} ${scrapStyles.pdfUploadButton}`}
                onClick={() => setShowUploadArea(!showUploadArea)}
              >
                <IoDocument size={20} />
                PDF
              </button>
            </div>
          )}
        </div>

        {showUploadArea && isAuthenticated && (
          <div className={`${scrapStyles.uploadSection} ${isUploading ? scrapStyles.uploading : ''}`}>
            <div className={scrapStyles.uploadDropzoneWrapper}>
              <div 
                className={`${scrapStyles.uploadDropzone} ${isDragging ? scrapStyles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('pdf-file-input')?.click()}
              >
                {isUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.loadingSpinner} style={{ marginBottom: '8px' }} />
                    <div style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>
                      업로드 중...
                    </div>
                  </div>
                ) : (
                  <>
                    <IoCloudUpload size={32} style={{ color: '#64748b', marginBottom: '8px' }} />
                    <div style={{ color: '#334155', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      {isDragging ? 'PDF 파일을 여기에 놓아주세요' : 'PDF 파일을 드래그하거나 클릭하여 업로드'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      PDF 파일만 지원됩니다 (최대 10MB)
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handlePDFUpload(file);
                      e.target.value = ''; // 입력 필드 자기화
                    }
                  }}
                  style={{ display: 'none' }}
                  id="pdf-file-input"
                  disabled={isUploading}
                />
              </div>
            </div>
            <div className={scrapStyles.uploadActions}>
              <button 
                className={scrapStyles.cancelButton}
                onClick={() => setShowUploadArea(false)}
                disabled={isUploading}
              >
                <IoClose size={16} />
                취소
              </button>
            </div>
          </div>
        )}

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
            <Tooltip content="스크랩 목록 새로고침" side='bottom'>
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
          {scrapsLoading && scraps.length === 0 ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingIndicator}>
                스크랩 목록을 불러오는 중...
              </div>
            </div>
          ) : scrapsError ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>
                {scrapsError}
              </div>
              <button 
                className={styles.retryButton}
                onClick={loadScraps}
              >
                다시 시도
              </button>
            </div>
          ) : filteredScraps.length === 0 && selectedTags.length > 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyMessage}>
                선택한 태그와 일치하는 스크랩이 없습니다.
              </div>
            </div>
          ) : scraps.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyMessage}>
                아직 스크랩한 내용이 없습니다.
              </div>
              <div className={styles.emptySubMessage}>
                💡 위의 "페이지 스크랩" 버튼을 눌러 1초만에 스크랩하세요!
              </div>
            </div>
          ) : (
            filteredScraps.map((scrap) => (
            <ScrapItem
              key={scrap.id} 
              scrap={scrap} 
              onDelete={async () => {
                try {
                  await scrapService.deleteScrap(parseInt(scrap.id));
                  await loadScraps(); // 동기적으로 처리
                  showSuccess('스크랩 삭제', '스크랩이 성공적으로 삭제되었습니다.');
                } catch (error: any) {
                  showError('삭제 실패', error?.message || '스크랩 삭제에 실패했습니다.');
                }
              }}
            />
          ))
          )}
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