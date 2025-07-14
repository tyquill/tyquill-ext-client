import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LandingPage from './pages/LandingPage';
import Header from './components/Header';
import ScrapPage from './pages/ScrapPage';
import TemplatePage from './pages/TemplatePage';
import DraftPage from './pages/DraftPage';
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
    setCurrentPage({ type: 'scrap' }); // 기본적으로 스크랩 페이지로 이동
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

  // 인증 상태에 따른 페이지 렌더링
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage({ type: 'scrap' });
    } else {
      setCurrentPage({ type: 'landing' });
    }
  }, [isAuthenticated]);

  // 로딩 중이거나 인증되지 않은 경우 랜딩 페이지
  if (!isAuthenticated || currentPage.type === 'landing') {
    return <LandingPage onStart={navigateToMain} />;
  }

  // 메인 앱 (헤더 + 페이지)
  return (
    <div className={styles.app}>
      <Header activeMenu={currentPage.type === 'archive-detail' ? 'archive' : currentPage.type} onMenuClick={handleMenuClick} />
      <div className={styles.appContent}>
        {currentPage.type === 'scrap' && <ScrapPage />}
        {currentPage.type === 'template' && <TemplatePage />}
        {currentPage.type === 'draft' && <DraftPage />}
        {currentPage.type === 'archive' && <ArchivePage onDraftClick={handleArchiveDetail} />}
        {currentPage.type === 'archive-detail' && currentPage.draftId && (
          <ArchiveDetailPage draftId={currentPage.draftId} onBack={handleArchiveBack} />
        )}
      </div>
    </div>
  );
};

export default App; 