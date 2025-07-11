import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import Header from './components/Header';
import ScrapPage from './pages/ScrapPage';
import TemplatePage from './pages/TemplatePage';
import DraftPage from './pages/DraftPage';
import ArchivePage from './pages/ArchivePage';
import styles from './App.module.css';

type PageType = 'landing' | 'scrap' | 'template' | 'draft' | 'archive';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');

  const navigateToMain = () => {
    setCurrentPage('scrap'); // 기본적으로 스크랩 페이지로 이동
  };

  const handleMenuClick = (menu: string) => {
    setCurrentPage(menu as PageType);
  };

  // 랜딩 페이지
  if (currentPage === 'landing') {
    return <LandingPage onStart={navigateToMain} />;
  }

  // 메인 앱 (헤더 + 페이지)
  return (
    <div className={styles.app}>
      <Header activeMenu={currentPage} onMenuClick={handleMenuClick} />
      <div className={styles.appContent}>
        {currentPage === 'scrap' && <ScrapPage />}
        {currentPage === 'template' && <TemplatePage />}
        {currentPage === 'draft' && <DraftPage />}
        {currentPage === 'archive' && <ArchivePage />}
      </div>
    </div>
  );
};

export default App; 