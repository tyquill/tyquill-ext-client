import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { useLanguageStore } from '../stores/languageStore';
import { ToastProvider } from '../hooks/useToast';
import { trackPageViewBridge, trackPageExitBridge } from '../analytics/bridge';
import LandingPage from './pages/LandingPage';
import Header, { Sidebar } from '../components/sidepanel/Header/Header';
import ScrapPage from './pages/ScrapPage';

import ArticleGeneratePage from './pages/ArticleGeneratePage';
import ArchivePage from './pages/ArchivePage';
import ArchiveDetailPage from './pages/ArchiveDetailPage';
import StyleManagementPage from './pages/StyleManagementPage';
import styles from './App.module.css';
import { PageType } from '../types/pages';

interface PageState {
  type: PageType;
  draftId?: string;
}

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { initializeLanguage } = useLanguageStore();
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'landing' });
  const previousPageRef = useRef<PageState>({ type: 'landing' });
  const pageStartTimeRef = useRef<number>(Date.now());

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

  // 언어 설정 초기화
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Chrome storage 변경 감지 (언어 설정 동기화)
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes['tyquill-language-preference']) {
        // 언어 설정이 변경되면 sidepanel에서도 동기화
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

  // 사이드패널 닫기 메시지 리스너
  useEffect(() => {
    const messageListener = (request: any, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (request.action === 'closeSidePanel') {
        window.close();
        sendResponse({ success: true });
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // 사이드패널이 닫힐 때 background에 알리기 & 최종 페이지 이탈 추적
    const handleBeforeUnload = () => {
      // 최종 페이지 이탈 추적
      const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
      if (duration > 0) {
        trackPageExitBridge({
          page: currentPage.type,
          page_detail: currentPage.draftId || null,
          duration,
          next_page: 'sidepanel_closed'
        }).catch(() => {});
      }

      browser.runtime.sendMessage({ action: 'sidePanelClosed' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 로딩 중이거나 인증되지 않은 경우 랜딩 페이지
  if (!isAuthenticated || currentPage.type === 'landing') {
    return (
      <ToastProvider>
        <LandingPage onStart={navigateToMain} />
      </ToastProvider>
    );
  }

  // 메인 앱 (헤더 + 메인 콘텐츠 + 사이드바)
  return (
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
          <Sidebar activeMenu={currentPage.type === 'archive-detail' ? 'archive' : currentPage.type} onMenuClick={handleMenuClick} />
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
