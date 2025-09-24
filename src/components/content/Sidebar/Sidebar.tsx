import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { useLanguageStore } from '../../../stores/languageStore';
import { ToastProvider } from '../../../hooks/useToast';
import { trackPageViewBridge, trackPageExitBridge } from '../../../analytics/bridge';
import { authService } from '../../../services/auth.service';
import { IoClose } from 'react-icons/io5';

// Import all the sidepanel components (now in sidepanel_unused)
import LandingPage from '../../../sidepanel_unused/pages/LandingPage';
import Header, { Sidebar as SidebarNav } from '../../../components/sidepanel/Header/Header';
import ScrapPage from '../../../sidepanel_unused/pages/ScrapPage';
import ArticleGeneratePage from '../../../sidepanel_unused/pages/ArticleGeneratePage';
import ArchivePage from '../../../sidepanel_unused/pages/ArchivePage';
import ArchiveDetailPage from '../../../sidepanel_unused/pages/ArchiveDetailPage';
import StyleManagementPage from '../../../sidepanel_unused/pages/StyleManagementPage';
import { PageType } from '../../../types/pages';

// Import styles
import styles from './Sidebar.module.css';

interface PageState {
  type: PageType;
  draftId?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { initializeLanguage } = useLanguageStore();
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'landing' });
  const previousPageRef = useRef<PageState>({ type: 'landing' });
  const pageStartTimeRef = useRef<number>(Date.now());
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Ensure sidebar dimensions remain fixed after animation
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const enforceDimensions = () => {
      // Force dimensions to prevent any expansion
      sidebar.style.width = '400px';
      sidebar.style.minWidth = '400px';
      sidebar.style.maxWidth = '400px';
      sidebar.style.position = 'fixed';
      sidebar.style.right = '0';
      sidebar.style.left = 'auto';
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.flexBasis = '400px';
      sidebar.style.flexGrow = '0';
      sidebar.style.flexShrink = '0';
    };

    const handleAnimationEnd = () => {
      enforceDimensions();
    };

    // Set up ResizeObserver to catch any unexpected size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // If width is not 400px, force it back
        if (width !== 400) {
          console.warn('Sidebar width changed unexpectedly to', width, 'forcing back to 400px');
          enforceDimensions();
        }
      }
    });

    sidebar.addEventListener('animationend', handleAnimationEnd);

    // Observe size changes
    if (isOpen) {
      resizeObserver.observe(sidebar);
      enforceDimensions();
    }

    return () => {
      sidebar.removeEventListener('animationend', handleAnimationEnd);
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  const navigateToMain = () => {
    setCurrentPage({ type: 'scrap' });
  };

  const handleMenuClick = (menu: string) => {
    setCurrentPage({ type: menu as PageType });
  };

  const handleArchiveDetail = (draftId: string) => {
    setCurrentPage({ type: 'archive-detail', draftId });
  };

  const handleArchiveBack = () => {
    setCurrentPage({ type: 'archive' });
  };

  const handleNavigateToDetail = (articleId: number) => {
    setCurrentPage({ type: 'archive-detail', draftId: articleId.toString() });
  };

  // Handle clicks on overlay backdrop - removed close functionality
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Do nothing - sidebar should only close via X button or extension button
    // Keeping this handler to prevent event propagation issues
  };

  // Handle clicks inside sidebar content to prevent event propagation
  const handleSidebarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent overlay click handler from firing
    event.stopPropagation();
  };

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // 언어 설정 초기화 및 인증 체크
  useEffect(() => {
    initializeLanguage();

    // 사이드바가 열릴 때 웹 클라이언트에서 인증 정보 체크
    const checkAuthOnOpen = async () => {
      try {
        const synced = await authService.syncAuthFromWebClient();
        if (synced) {
          console.log('✅ Auth synced from web client on sidebar open');
        }
      } catch (error) {
        console.error('Failed to sync auth on open:', error);
      }
    };

    if (isOpen) {
      checkAuthOnOpen();
    }
  }, [initializeLanguage, isOpen]);

  // Chrome storage 변경 감지 (언어 설정 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        // 언어 설정이 변경되면 sidebar에서도 동기화
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // 인증 상태에 따른 페이지 렌더링
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage({ type: 'scrap' });
    } else {
      setCurrentPage({ type: 'landing' });
    }
  }, [isAuthenticated]);

  // 페이지 네비게이션 추적
  useEffect(() => {
    const currentTime = Date.now();
    const previousPage = previousPageRef.current;

    // 이전 페이지 이탈 추적 (첫 페이지가 아닌 경우)
    if (previousPage.type !== currentPage.type || previousPage.draftId !== currentPage.draftId) {
      const duration = Math.round((currentTime - pageStartTimeRef.current) / 1000);

      // 이전 페이지 이탈 이벤트 (0초 이상인 경우만)
      if (duration > 0) {
        trackPageExitBridge({
          page: previousPage.type,
          page_detail: previousPage.draftId || null,
          duration,
          next_page: currentPage.type
        }).catch(() => {});
      }
    }

    // 현재 페이지 진입 추적
    trackPageViewBridge({
      page: currentPage.type,
      page_detail: currentPage.draftId || null,
      previous_page: previousPage.type,
      is_authenticated: isAuthenticated
    }).catch(() => {});

    // 상태 업데이트
    previousPageRef.current = currentPage;
    pageStartTimeRef.current = currentTime;
  }, [currentPage, isAuthenticated]);

  // Background Script로부터의 메시지 처리
  useEffect(() => {
    const messageListener = (request: any, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (request.action === 'closeSidebar') {
        onClose();
        sendResponse({ success: true });
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // 사이드바가 닫힐 때 최종 페이지 이탈 추적
    const handleBeforeClose = () => {
      const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
      if (duration > 0) {
        trackPageExitBridge({
          page: currentPage.type,
          page_detail: currentPage.draftId || null,
          duration,
          next_page: 'sidebar_closed'
        }).catch(() => {});
      }
    };

    return () => {
      handleBeforeClose();
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [onClose, currentPage]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // 로딩 중이거나 인증되지 않은 경우 랜딩 페이지
  if (!isAuthenticated || currentPage.type === 'landing') {
    return (
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div ref={sidebarRef} className={styles.sidebar} onClick={handleSidebarClick}>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close sidebar"
            type="button"
          >
            <IoClose size={24} />
          </button>
          <ToastProvider>
            <LandingPage onStart={navigateToMain} />
          </ToastProvider>
        </div>
      </div>
    );
  }

  // 메인 앱 (헤더 + 메인 콘텐츠 + 사이드바)
  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div ref={sidebarRef} className={styles.sidebar} onClick={handleSidebarClick}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close sidebar"
          type="button"
        >
          <IoClose size={24} />
        </button>
        <ToastProvider>
          <div className={styles.app}>
            <Header />
            <div className={styles.appMain}>
              <div className={styles.appContent}>
                {currentPage.type === 'scrap' && <ScrapPage />}

                {currentPage.type === 'draft' && (
                  <ArticleGeneratePage
                    onNavigateToDetail={handleNavigateToDetail}
                    onNavigate={handleMenuClick}
                  />
                )}
                {currentPage.type === 'archive' && (
                  <ArchivePage
                    onDraftClick={handleArchiveDetail}
                  />
                )}
                {currentPage.type === 'archive-detail' && currentPage.draftId && (
                  <ArchiveDetailPage draftId={currentPage.draftId} onBack={handleArchiveBack} />
                )}
                {currentPage.type === 'style-management' && <StyleManagementPage />}
              </div>
              <SidebarNav
                activeMenu={currentPage.type === 'archive-detail' ? 'archive' : currentPage.type}
                onMenuClick={handleMenuClick}
              />
            </div>
          </div>
        </ToastProvider>
      </div>
    </div>
  );
};

export default Sidebar;