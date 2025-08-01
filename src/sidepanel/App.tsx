import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ToastProvider } from '../hooks/useToast';
import LandingPage from './pages/LandingPage';
import Header, { Sidebar } from '../components/sidepanel/Header/Header';
import ScrapPage from './pages/ScrapPage';
import TemplatePage from './pages/TemplatePage';
import ArticleGeneratePage from './pages/ArticleGeneratePage';
import ArchivePage from './pages/ArchivePage';
import ArchiveDetailPage from './pages/ArchiveDetailPage';
import styles from './App.module.css';
import { PageType } from '../types/pages';

interface PageState {
  type: PageType;
  draftId?: string;
}

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'landing' });

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

  // 인증 상태에 따른 페이지 렌더링
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage({ type: 'scrap' });
    } else {
      setCurrentPage({ type: 'landing' });
    }
  }, [isAuthenticated]);

  // 사이드패널 닫기 메시지 리스너
  useEffect(() => {
    const messageListener = (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (request.action === 'closeSidePanel') {
        window.close();
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 사이드패널이 닫힐 때 background에 알리기
    const handleBeforeUnload = () => {
      chrome.runtime.sendMessage({ action: 'sidePanelClosed' });
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
            {/* {currentPage.type === 'template' && <TemplatePage />} */}
            {currentPage.type === 'draft' && (
              <ArticleGeneratePage 
                onNavigateToDetail={handleNavigateToDetail}
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
          </div>
          <Sidebar activeMenu={currentPage.type === 'archive-detail' ? 'archive' : currentPage.type} onMenuClick={handleMenuClick} />
        </div>
      </div>
    </ToastProvider>
  );
};

export default App; 