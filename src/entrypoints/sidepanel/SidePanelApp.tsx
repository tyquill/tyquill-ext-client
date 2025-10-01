import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { useLanguageStore } from '../../stores/languageStore';
import { ToastProvider } from '../../hooks/useToast';
import { trackPageViewBridge, trackPageExitBridge } from '../../analytics/bridge';
import { authService } from '../../services/auth.service';
import { IoRefresh, IoSettings } from 'react-icons/io5';
import Settings from '../../components/content/Settings/Settings';

// Import all the sidepanel components
import LandingPage from '../../sidepanel_unused/pages/LandingPage';
import Header, { Sidebar as SidebarNav } from '../../components/sidepanel/Header/Header';
import ScrapPage, { ScrapPageRef } from '../../sidepanel_unused/pages/ScrapPage';
import ArticleGeneratePage from '../../sidepanel_unused/pages/ArticleGeneratePage';
import ArchivePage, { ArchivePageRef } from '../../sidepanel_unused/pages/ArchivePage';
import ArchiveDetailPage from '../../sidepanel_unused/pages/ArchiveDetailPage';
import StyleManagementPage from '../../sidepanel_unused/pages/StyleManagementPage';
import { PageType } from '../../types/pages';

// Import styles
import styles from './SidePanelApp.module.css';

interface PageState {
  type: PageType;
  draftId?: string;
}

const SidePanelApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { initializeLanguage } = useLanguageStore();
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'landing' });
  const previousPageRef = useRef<PageState>({ type: 'landing' });
  const pageStartTimeRef = useRef<number>(Date.now());
  const scrapPageRef = useRef<ScrapPageRef>(null);
  const archivePageRef = useRef<ArchivePageRef>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  // Handle refresh based on current page type
  const handleRefresh = () => {
    switch (currentPage.type) {
      case 'scrap':
        scrapPageRef.current?.refreshList();
        break;
      case 'archive':
      case 'archive-detail':
        archivePageRef.current?.refreshList();
        break;
      default:
        break;
    }
  };

  // Initialize language settings
  useEffect(() => {
    initializeLanguage();

    // Check auth from web client on mount
    const checkAuthOnOpen = async () => {
      try {
        const synced = await authService.syncAuthFromWebClient();
        if (synced) {
          // console.log('✅ Auth synced from web client on sidepanel open');
        }
      } catch (error) {
        console.error('Failed to sync auth on open:', error);
      }
    };

    checkAuthOnOpen();
  }, [initializeLanguage]);

  // Chrome storage change detection (language settings sync)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        initializeLanguage();
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initializeLanguage]);

  // Set page based on authentication status
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage({ type: 'scrap' });
    } else {
      setCurrentPage({ type: 'landing' });
    }
  }, [isAuthenticated]);

  // Page navigation tracking
  useEffect(() => {
    const currentTime = Date.now();
    const previousPage = previousPageRef.current;

    // Track previous page exit
    if (previousPage.type !== currentPage.type || previousPage.draftId !== currentPage.draftId) {
      const duration = Math.round((currentTime - pageStartTimeRef.current) / 1000);

      if (duration > 0) {
        trackPageExitBridge({
          page: previousPage.type,
          page_detail: previousPage.draftId || null,
          duration,
          next_page: currentPage.type
        }).catch(() => {});
      }
    }

    // Track current page view
    trackPageViewBridge({
      page: currentPage.type,
      page_detail: currentPage.draftId || null,
      previous_page: previousPage.type,
      is_authenticated: isAuthenticated
    }).catch(() => {});

    // Update state
    previousPageRef.current = currentPage;
    pageStartTimeRef.current = currentTime;
  }, [currentPage, isAuthenticated]);

  // Handle messages from background script and web client
  useEffect(() => {
    const handleWebClientMessage = async (event: MessageEvent) => {
      // Handle auth request from web client
      if ((event.origin === 'http://localhost:5173' || event.origin === 'https://app.tyquill.ai') &&
          typeof event.data === 'object' && event.data !== null &&
          event.data.type === 'TYQUILL_GET_AUTH_REQUEST' &&
          event.data.source === 'tyquill-web-client') {

        try {
          const response = await browser.runtime.sendMessage({
            action: 'getAuthState'
          });

          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: response?.authState || null
          }, event.origin);
        } catch (error) {
          console.error('Failed to get auth state from extension:', error);
          window.postMessage({
            type: 'TYQUILL_AUTH_RESPONSE',
            source: 'tyquill-extension',
            authState: null
          }, event.origin);
        }
      }

      // Handle logout notification from web client
      if ((event.origin === 'http://localhost:5173' || event.origin === 'https://app.tyquill.ai') &&
          typeof event.data === 'object' && event.data !== null &&
          event.data.type === 'TYQUILL_LOGOUT_NOTIFICATION' &&
          event.data.source === 'tyquill-web-client') {

        try {
          await browser.runtime.sendMessage({
            action: 'logoutFromWebClient'
          });
        } catch (error) {
          console.error('Failed to trigger extension logout:', error);
        }
      }
    };

    window.addEventListener('message', handleWebClientMessage);

    return () => {
      window.removeEventListener('message', handleWebClientMessage);
    };
  }, []);

  // Track final page exit on unmount
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
      if (duration > 0) {
        trackPageExitBridge({
          page: currentPage.type,
          page_detail: currentPage.draftId || null,
          duration,
          next_page: 'sidepanel_closed'
        }).catch(() => {});
      }
    };
  }, [currentPage]);

  // Landing page (unauthenticated)
  if (!isAuthenticated || currentPage.type === 'landing') {
    return (
      <div className={styles.sidepanel}>
        <div className={styles.sidepanelHeader}>
          <div className={styles.headerMain}>
            <div className={styles.headerLeft}>
              <div className={styles.brandArea}>
                <span className={styles.brandText}>Tyquill</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidepanelContent}>
          <ToastProvider>
            <LandingPage onStart={navigateToMain} />
          </ToastProvider>
        </div>

        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  // Main app (authenticated)
  return (
    <div className={styles.sidepanel}>
      <div className={styles.sidepanelHeader}>
        <div className={styles.headerMain}>
          <div className={styles.headerLeft}>
            <div className={styles.brandArea}>
              <span className={styles.brandText}>Tyquill</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              className={styles.actionButton}
              onClick={handleRefresh}
              aria-label="Refresh current page content"
              type="button"
              title="Refresh"
            >
              <IoRefresh size={18} />
            </button>
            <button
              className={styles.actionButton}
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
              type="button"
              title="Settings"
            >
              <IoSettings size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.sidepanelContent}>
        <ToastProvider>
          <div className={styles.app}>
            <Header />
            <div className={styles.appMain}>
              <div className={styles.appContent}>
                {currentPage.type === 'scrap' && <ScrapPage ref={scrapPageRef} />}
                {currentPage.type === 'draft' && (
                  <ArticleGeneratePage
                    onNavigateToDetail={handleNavigateToDetail}
                    onNavigate={handleMenuClick}
                  />
                )}
                {currentPage.type === 'archive' && (
                  <ArchivePage
                    ref={archivePageRef}
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

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default SidePanelApp;
