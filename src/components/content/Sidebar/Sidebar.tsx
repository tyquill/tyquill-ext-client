import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { useLanguageStore } from '../../../stores/languageStore';
import { ToastProvider } from '../../../hooks/useToast';
import { trackPageViewBridge, trackPageExitBridge } from '../../../analytics/bridge';
import { authService } from '../../../services/auth.service';
import { IoClose, IoRefresh, IoSettings } from 'react-icons/io5';
import Settings from '../Settings/Settings';

// Import all the sidepanel components (now in sidepanel_unused)
import LandingPage from '../../../sidepanel_unused/pages/LandingPage';
import Header, { Sidebar as SidebarNav } from '../../../components/sidepanel/Header/Header';
import UnifiedContentPage from '../../../sidepanel_unused/pages/UnifiedContentPage';
import ArticleGeneratePage from '../../../sidepanel_unused/pages/ArticleGeneratePage';
import ArchiveDetailPage from '../../../sidepanel_unused/pages/ArchiveDetailPage';
import StyleManagementPage from '../../../sidepanel_unused/pages/StyleManagementPage';
import { PageType } from '../../../types/pages';

// Import styles
import styles from './Sidebar.module.css';

interface PageState {
  type: PageType;
  draftId?: string;
}

interface SidebarPosition {
  x: number;
  y: number;
}

interface SavedSidebarPosition {
  x: number;
  // Y position is not saved - always use default
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
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
  const [showSettings, setShowSettings] = useState(false);

  // Calculate default Y position (properly center the 98vh sidebar)
  const getDefaultY = useCallback(() => {
    // For a 98vh sidebar to be centered: (100vh - 98vh) / 2 = 1vh from top
    // This gives equal 1vh margins at top and bottom
    return Math.max(10, window.innerHeight * 0.01);
  }, []);

  // Drag and drop state
  const [position, setPosition] = useState<SidebarPosition>({
    x: window.innerWidth - 440,
    y: getDefaultY()
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [isAnimatingY, setIsAnimatingY] = useState(false);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  // Load saved position from storage
  useEffect(() => {
    const loadSavedPosition = async () => {
      try {
        const result = await browser.storage.local.get('tyquill-sidebar-position');
        const defaultY = getDefaultY();

        if (result['tyquill-sidebar-position']) {
          const savedPosition = result['tyquill-sidebar-position'];
          // Handle legacy string positions
          if (typeof savedPosition === 'string') {
            setPosition({
              x: savedPosition === 'left' ? 10 : window.innerWidth - 440,
              y: defaultY // Always use default Y
            });
          } else if (typeof savedPosition === 'object' && 'x' in savedPosition) {
            // Use saved X position but always default Y
            setPosition({
              x: savedPosition.x,
              y: defaultY // Always use default Y
            });
          } else {
            // Fallback to default position
            setPosition({
              x: window.innerWidth - 440,
              y: defaultY
            });
          }
        } else {
          // No saved position, use defaults
          setPosition({
            x: window.innerWidth - 440,
            y: defaultY
          });
        }
      } catch (error) {
        console.error('Failed to load sidebar position:', error);
      }
    };

    if (isOpen) {
      loadSavedPosition();
    }
  }, [isOpen, getDefaultY]);

  // Clear saved position to reset to default on next open
  const clearSavedPosition = useCallback(async () => {
    try {
      await browser.storage.local.remove('tyquill-sidebar-position');
    } catch (error) {
      console.error('Failed to clear sidebar position:', error);
    }
  }, []);

  // Save only X position to storage (Y always returns to default)
  const savePosition = useCallback(async (newPosition: SidebarPosition) => {
    try {
      const positionToSave: SavedSidebarPosition = { x: newPosition.x };
      await browser.storage.local.set({ 'tyquill-sidebar-position': positionToSave });
    } catch (error) {
      console.error('Failed to save sidebar position:', error);
    }
  }, []);

  // Clear saved position when sidebar closes to reset to default position on next open
  useEffect(() => {
    if (!isOpen) {
      clearSavedPosition();
    }
  }, [isOpen, clearSavedPosition]);

  // Keep sidebar within viewport bounds
  const constrainToViewport = useCallback((x: number, y: number) => {
    const sidebarWidth = 430;
    const sidebarHeight = 600; // Approximate height

    const minX = 10;
    const maxX = window.innerWidth - sidebarWidth - 10;
    const minY = 10;
    const maxY = window.innerHeight - sidebarHeight - 10;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }, []);

  // Ensure sidebar dimensions remain fixed and apply exact positioning
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const enforceDimensions = () => {
      // Force dimensions to prevent any expansion
      sidebar.style.width = '430px';
      sidebar.style.minWidth = '430px';
      sidebar.style.maxWidth = '430px';
      sidebar.style.position = 'fixed';

      // Apply exact positioning - always override CSS defaults
      const constrainedPos = constrainToViewport(position.x, position.y);
      sidebar.style.left = `${constrainedPos.x}px`;
      sidebar.style.top = `${constrainedPos.y}px`;
      sidebar.style.right = 'auto';
      sidebar.style.transform = 'none';

      // Enable transitions based on state
      if (!dragState.isDragging && !isAnimatingY) {
        sidebar.style.transition = 'opacity 0.3s ease'; // Only transition opacity, not position
      } else if (isAnimatingY) {
        sidebar.style.transition = 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'; // Smooth Y animation
      } else {
        sidebar.style.transition = 'none';
      }

      sidebar.style.flexBasis = '430px';
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
  }, [isOpen, position, dragState.isDragging, isAnimatingY, constrainToViewport]);

  const navigateToMain = () => {
    setCurrentPage({ type: 'content' });
  };

  const handleMenuClick = (menu: string) => {
    setCurrentPage({ type: menu as PageType });
  };

  const handleNavigateToDetail = (articleId: string) => { // UUID
    setCurrentPage({ type: 'archive-detail', draftId: articleId });
  };

  const handleArchiveBack = () => {
    setCurrentPage({ type: 'content' });
  };

  // Handle refresh based on current page type
  const handleRefresh = useCallback(() => {
    switch (currentPage.type) {
      case 'content':
        // Unified content page has its own refresh mechanism
        break;
      default:
        // For other pages, do nothing or show a message
        // console.log('Refresh not available for this page type:', currentPage.type);
        break;
    }
  }, [currentPage.type]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Get current actual position from DOM (getBoundingClientRect gives actual rendered position)
    const rect = sidebar.getBoundingClientRect();

    // Calculate offset from mouse to sidebar's top-left corner
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Ensure sidebar position state matches actual DOM position before dragging
    const currentPosition = { x: rect.left, y: rect.top };
    setPosition(currentPosition);

    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX,
      offsetY
    });

    // Disable transitions during drag and prevent text selection
    sidebar.style.transition = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Calculate new position
    const newX = e.clientX - dragState.offsetX;
    const newY = e.clientY - dragState.offsetY;

    // Constrain to viewport bounds during drag
    const constrainedPos = constrainToViewport(newX, newY);

    // Apply position directly to DOM during drag for smooth real-time following
    // Disable transitions and transforms that could interfere
    sidebar.style.left = `${constrainedPos.x}px`;
    sidebar.style.right = 'auto';
    sidebar.style.top = `${constrainedPos.y}px`;
    sidebar.style.transform = 'none';
    sidebar.style.transition = 'none';

    // DON'T update React state during drag to avoid re-renders that interfere with smooth dragging
    // Position will be updated only once in handleDragEnd when dropping
  }, [dragState, constrainToViewport]);

  const handleDragEnd = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Calculate final position where dropped
    const finalX = e.clientX - dragState.offsetX;
    const finalY = e.clientY - dragState.offsetY;

    // Constrain X to viewport bounds, but keep the default Y
    const defaultY = getDefaultY();
    const constrainedX = Math.max(10, Math.min(window.innerWidth - 440, finalX));

    const finalPosition: SidebarPosition = {
      x: constrainedX,
      y: defaultY // Always snap back to default Y
    };

    // Start Y animation back to default position
    setIsAnimatingY(true);

    // Apply final X position and animate Y back to default
    sidebar.style.left = `${constrainedX}px`;
    sidebar.style.top = `${defaultY}px`;
    sidebar.style.right = 'auto';
    sidebar.style.transform = 'none';
    sidebar.style.transition = 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';

    // Update React state and save position (only X coordinate)
    setPosition(finalPosition);
    savePosition(finalPosition);

    // Reset drag state
    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    });

    // Restore body styles
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // End Y animation after transition completes
    setTimeout(() => {
      setIsAnimatingY(false);
    }, 500); // Match the transition duration
  }, [dragState.isDragging, dragState.offsetX, dragState.offsetY, savePosition, getDefaultY]);

  // Mouse event listeners for dragging
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // Handle window resize - keep sidebar in bounds and recalculate default Y
  useEffect(() => {
    const handleResize = () => {
      const sidebar = sidebarRef.current;
      if (!sidebar || dragState.isDragging || isAnimatingY) return;

      // Recalculate default Y position and constrain X to new viewport bounds
      const newDefaultY = getDefaultY();
      const constrainedX = Math.max(10, Math.min(window.innerWidth - 440, position.x));

      const newPosition = { x: constrainedX, y: newDefaultY };

      // Update position if it changed due to resize
      if (constrainedX !== position.x || newDefaultY !== position.y) {
        setPosition(newPosition);
        savePosition(newPosition);
      }

      // Apply the position only when not dragging or animating
      sidebar.style.left = `${constrainedX}px`;
      sidebar.style.top = `${newDefaultY}px`;
      sidebar.style.right = 'auto';
      sidebar.style.transform = 'none';
      sidebar.style.transition = 'opacity 0.3s ease'; // Only transition opacity, not position
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, dragState.isDragging, isAnimatingY, getDefaultY, savePosition]);

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
          // console.log('✅ Auth synced from web client on sidebar open');
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
      setCurrentPage({ type: 'content' });
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
        <div
          ref={sidebarRef}
          className={`${styles.sidebar} ${dragState.isDragging ? styles.dragging : ''}`}
          onClick={handleSidebarClick}
        >
          {/* Improved header structure */}
          <div className={styles.sidebarHeader}>
            {/* Main header row */}
            <div className={styles.headerMain}>
              {/* Centered drag handle */}
              <button
                ref={dragHandleRef}
                className={styles.dragHandle}
                onMouseDown={handleDragStart}
                aria-label="Drag to move sidebar"
                type="button"
                title="Drag to move"
              >
                <div className={styles.dragGrip} />
              </button>

              {/* Left side: Brand area */}
              <div className={styles.headerLeft}>
                <div className={styles.brandArea}>
                  <span className={styles.brandText}>Tyquill</span>
                </div>
              </div>

              {/* Right side: Action buttons */}
              <div className={styles.headerRight}>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close sidebar"
                  type="button"
                  title="Close"
                >
                  <IoClose size={18} />
                </button>
              </div>
            </div>

            {/* Sub-header: Context/URL info will be added by the Header component */}
          </div>

          {/* Main content area */}
          <div className={styles.sidebarContent}>
            <ToastProvider>
              <LandingPage onStart={navigateToMain} />
            </ToastProvider>
          </div>

          {/* Settings overlay - positioned at sidebar root to cover entire sidebar */}
          <Settings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      </div>
    );
  }

  // 메인 앱 (헤더 + 메인 콘텐츠 + 사이드바)
  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        ref={sidebarRef}
        className={`${styles.sidebar} ${dragState.isDragging ? styles.dragging : ''}`}
        onClick={handleSidebarClick}
      >
        {/* Improved header structure */}
        <div className={styles.sidebarHeader}>
          {/* Main header row */}
          <div className={styles.headerMain}>
            {/* Centered drag handle */}
            <button
              ref={dragHandleRef}
              className={styles.dragHandle}
              onMouseDown={handleDragStart}
              aria-label="Drag to move sidebar"
              type="button"
              title="Drag to move"
            >
              <div className={styles.dragGrip} />
            </button>

            {/* Left side: Brand area */}
            <div className={styles.headerLeft}>
              <div className={styles.brandArea}>
                <span className={styles.brandText}>Tyquill</span>
              </div>
            </div>

            {/* Right side: Action buttons */}
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
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close sidebar"
                type="button"
                title="Close"
              >
                <IoClose size={16} />
              </button>
            </div>
          </div>

          {/* Sub-header: Context/URL info will be added by the Header component */}
        </div>

        {/* Main content area */}
        <div className={styles.sidebarContent}>
          <ToastProvider>
            <div className={styles.app}>
              <Header />
              <div className={styles.appMain}>
                <div className={styles.appContent}>
                  {currentPage.type === 'content' && (
                    <UnifiedContentPage onNavigateToDetail={handleNavigateToDetail} />
                  )}

                  {currentPage.type === 'draft' && (
                    <ArticleGeneratePage
                      onNavigateToDetail={handleNavigateToDetail}
                      onNavigate={handleMenuClick}
                    />
                  )}
                  {currentPage.type === 'archive-detail' && currentPage.draftId && (
                    <ArchiveDetailPage draftId={currentPage.draftId} onBack={handleArchiveBack} />
                  )}
                  {currentPage.type === 'style-management' && <StyleManagementPage />}
                </div>
                <SidebarNav
                  activeMenu={currentPage.type === 'archive-detail' ? 'content' : currentPage.type}
                  onMenuClick={handleMenuClick}
                />
              </div>
            </div>
          </ToastProvider>
        </div>

        {/* Settings overlay - positioned at sidebar root to cover entire sidebar */}
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>
  );
};

export default Sidebar;