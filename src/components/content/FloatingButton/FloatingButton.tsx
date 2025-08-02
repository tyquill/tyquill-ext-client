
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clipAndScrapCurrentPage } from '../../../utils/scrapHelper';
import styles from './FloatingButton.module.css';
import { BsBook } from 'react-icons/bs';

// 타입 정의
type ButtonStyle = {
  borderRadius: string;
  flexDirection: 'row' | 'row-reverse';
  width: string;
  height: string;
  padding: string;
  justifyContent: 'flex-start' | 'center';
  gap: string;
};

type ToolboxStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
  opacity: number;
  pointerEvents: 'auto' | 'none';
  cursor: 'pointer' | 'wait';
  transform?: string;
};

const FloatingButton: React.FC = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isToolboxActive, setIsToolboxActive] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({
    top: '50%',
    right: '-40px',
    left: 'auto',
    transform: 'translateY(-50%)'
  });
  const [toolboxPosition, setToolboxPosition] = useState({
    left: '0px',
    top: '0px'
  });
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>({
    borderRadius: '32px 0 0 32px',
    flexDirection: 'row',
    width: 'auto',
    height: '36px',
    padding: '0 8px',
    justifyContent: 'flex-start',
    gap: '6px'
  });
  const [toolboxStyle, setToolboxStyle] = useState<ToolboxStyle>({
    backgroundColor: 'white',
    color: '#333',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    opacity: 1,
    pointerEvents: 'auto',
    cursor: 'pointer'
  });
  const [isVisible, setIsVisible] = useState(true);

  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hiddenButtonWidth = 40;

  // 유튜브 전체화면 감지 함수
  const checkYouTubeFullscreen = useCallback(() => {
    // 유튜브 전체화면 감지
    const isYouTubeFullscreen = 
      document.fullscreenElement?.classList.contains('html5-video-player') ||
      document.fullscreenElement?.tagName === 'VIDEO' ||
      document.fullscreenElement?.classList.contains('ytp-fullscreen') ||
      document.querySelector('.ytp-fullscreen') !== null ||
      document.querySelector('.html5-video-player.ytp-fullscreen') !== null ||
      document.querySelector('.ytp-fullscreen-button[aria-pressed="true"]') !== null;

    // 일반 전체화면 감지
    const isGeneralFullscreen = !!document.fullscreenElement;

    // 유튜브 페이지에서 전체화면 모드인지 확인
    const isYouTubePage = window.location.hostname.includes('youtube.com') || 
                         window.location.hostname.includes('youtu.be');
    
    const shouldHide = (isYouTubePage && isYouTubeFullscreen) || isGeneralFullscreen;
    
    setIsVisible(!shouldHide);
  }, []);

  // 현재 버튼 위치 확인
  const getCurrentSide = useCallback((): 'left' | 'right' => {
    if (!buttonRef.current) return 'right';
    const computedStyle = getComputedStyle(buttonRef.current);
    return computedStyle.right === 'auto' ||
      computedStyle.left === `-${hiddenButtonWidth}px`
      ? 'left'
      : 'right';
  }, []);

  // 툴박스 위치 계산 (버튼의 실제 보이는 위치 기준, hover 효과 제외)
  const positionToolbox = useCallback(() => {
    if (!buttonRef.current || !toolboxRef.current) return;

    const gap = 16;
    const toolboxSize = 36;
    const viewportWidth = window.innerWidth;
    const currentSide = getCurrentSide();
    
    // 현재 버튼의 실제 rect 가져오기
    const buttonRect = buttonRef.current.getBoundingClientRect();
    
    // 버튼의 보이는 부분 계산 (hidden width 제외)
    let visibleButtonLeft;
    if (currentSide === 'left') {
      visibleButtonLeft = buttonRect.left + hiddenButtonWidth;
    } else {
      visibleButtonLeft = buttonRect.left;
    }
    
    // 이미지(로고)의 중심점 계산
    let logoCenterX;
    if (imgRef.current) {
      const imgRect = imgRef.current.getBoundingClientRect();
      logoCenterX = imgRect.left + imgRect.width / 2;
    } else {
      // 이미지 ref가 없으면 추정
      logoCenterX = visibleButtonLeft + (currentSide === 'left' ? 56 : 24);
    }
    
    let toolboxLeft = logoCenterX - toolboxSize / 2;

    // 뷰포트 경계 체크
    const margin = 8;
    if (toolboxLeft < margin) {
      toolboxLeft = margin;
    } else if (toolboxLeft + toolboxSize > viewportWidth - margin) {
      toolboxLeft = viewportWidth - toolboxSize - margin;
    }

    setToolboxPosition({
      left: `${toolboxLeft}px`,
      top: `${buttonRect.top - toolboxSize - gap}px`
    });
  }, [getCurrentSide]);

  // 호버 효과 처리
  const handleHover = useCallback((isEntering: boolean) => {
    const currentSide = getCurrentSide();
    const yTransform = buttonPosition.top === '50%' ? 'translateY(-50%)' : '';
    
    if (currentSide === 'left') {
      if (isEntering) {
        setButtonPosition(prev => ({
          ...prev,
          transform: `${yTransform} translateX(${hiddenButtonWidth}px) scale(1.02)`.trim()
        }));
      } else {
        setButtonPosition(prev => ({
          ...prev,
          transform: `${yTransform} scale(1)`.trim()
        }));
      }
    } else {
      if (isEntering) {
        setButtonPosition(prev => ({
          ...prev,
          transform: `${yTransform} translateX(-${hiddenButtonWidth}px) scale(1.02)`.trim()
        }));
      } else {
        setButtonPosition(prev => ({
          ...prev,
          transform: `${yTransform} scale(1)`.trim()
        }));
      }
    }
  }, [buttonPosition.top, getCurrentSide]);

  // 마우스 이벤트 핸들러들
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);

    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top
    };

    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !buttonRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (!hasMoved && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setHasMoved(true);
      
      // 실제 드래그가 시작될 때 툴박스 숨기기
      setToolboxStyle(prev => ({
        ...prev,
        opacity: 0,
        pointerEvents: 'none'
      }));
      
      // 드래그 스타일 적용
      setButtonStyle({
        borderRadius: '50%',
        flexDirection: 'row',
        width: '40px',
        height: '40px',
        padding: '8px',
        justifyContent: 'center',
        gap: '0px'
      });

      setButtonPosition({
        top: `${dragStartRef.current.top}px`,
        left: `${dragStartRef.current.left}px`,
        right: 'auto',
        transform: 'none'
      });
    }

    if (hasMoved) {
      const newLeft = dragStartRef.current.left + deltaX;
      const newTop = dragStartRef.current.top + deltaY;

      const maxLeft = window.innerWidth - 40;
      const maxTop = window.innerHeight - 40;

      setButtonPosition({
        top: `${Math.max(0, Math.min(newTop, maxTop))}px`,
        left: `${Math.max(0, Math.min(newLeft, maxLeft))}px`,
        right: 'auto',
        transform: 'none'
      });
    }
  }, [isDragging, hasMoved]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    
    if (hasMoved && buttonRef.current) {
      // 실제 드래그가 발생한 경우
      setHasMoved(false); // 드래그 완료 후 hasMoved 리셋
      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const isLeftSide = buttonCenterX < window.innerWidth / 2;

      const currentTop = rect.top;

      setButtonStyle({
        borderRadius: isLeftSide ? '0 32px 32px 0' : '32px 0 0 32px',
        flexDirection: isLeftSide ? 'row-reverse' : 'row',
        width: 'auto',
        height: '36px',
        padding: '0 8px',
        justifyContent: 'flex-start',
        gap: '6px'
      });

      setButtonPosition({
        top: `${currentTop}px`,
        left: isLeftSide ? `-${hiddenButtonWidth}px` : 'auto',
        right: isLeftSide ? 'auto' : `-${hiddenButtonWidth}px`,
        transform: 'translateY(-50%)'
      });

      // 툴박스 다시 표시
      setTimeout(() => {
        setToolboxStyle(prev => ({
          ...prev,
          opacity: 1,
          pointerEvents: 'auto'
        }));
        positionToolbox();
      }, 300);
    } else if (!hasMoved) {
      // 단순 클릭인 경우 - 툴박스가 숨겨지지 않았으므로 아무것도 하지 않음
      // 툴박스는 이미 보이는 상태를 유지
    }
  }, [isDragging, hasMoved, positionToolbox]);

  // 사이드패널 관련 함수들
  const getSidePanelState = useCallback(async (): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSidePanelState',
      });

      if (response?.success) {
        return response.isOpen;
      } else {
        console.error('❌ Content: Failed to get side panel state:', response?.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Content: Failed to send message to background:', error);
      return false;
    }
  }, []);

  const openSidePanel = useCallback(async (): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'openSidePanel',
      });

      if (response?.success) {
        return true;
      } else {
        console.error('❌ Content: Failed to open side panel:', response?.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Content: Failed to send message to background:', error);
      return false;
    }
  }, []);

  const closeSidePanel = useCallback(async (): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'closeSidePanel',
      });

      if (response?.success) {
        return true;
      } else {
        console.error('❌ Content: Failed to close side panel:', response?.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Content: Failed to send message to background:', error);
      return false;
    }
  }, []);

  // 스크랩 처리
  const handleScrap = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setToolboxStyle(prev => ({
        ...prev,
        opacity: 0.7,
        pointerEvents: 'none',
        cursor: 'wait'
      }));

      await clipAndScrapCurrentPage();

      // 성공 상태
      setToolboxStyle(prev => ({
        ...prev,
        backgroundColor: '#10b981',
        color: 'white',
        borderColor: '#10b981'
      }));
    } catch (error) {
      // 에러 상태
      setToolboxStyle(prev => ({
        ...prev,
        backgroundColor: '#ef4444',
        color: 'white',
        borderColor: '#ef4444'
      }));
      console.error('❌ 스크랩 실패:', error);
    } finally {
      setIsLoading(false);

      // 3초 후 원래 상태로 복원
      setTimeout(() => {
        setToolboxStyle({
          backgroundColor: 'white',
          color: '#333',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          opacity: 1,
          pointerEvents: 'auto',
          cursor: 'pointer'
        });
      }, 3000);
    }
  }, [isLoading]);

  // 메인 버튼 클릭 핸들러
  const handleButtonClick = useCallback(async () => {
    if (hasMoved) return;

    const currentState = await getSidePanelState();
    
    if (!currentState) {
      await openSidePanel();
    } else {
      await closeSidePanel();
    }
  }, [hasMoved, getSidePanelState, openSidePanel, closeSidePanel]);

  // 툴박스 호버 효과
  const handleToolboxMouseEnter = useCallback(() => {
    setIsToolboxActive(true);
    setToolboxStyle(prev => ({
      ...prev,
      backgroundColor: '#f5f5f5',
      transform: 'scale(1.05)'
    }));
  }, []);

  const handleToolboxMouseLeave = useCallback(() => {
    setIsToolboxActive(false);
    if (!isLoading) {
      const currentBgColor = toolboxStyle.backgroundColor;
      if (
        currentBgColor !== 'rgb(16, 185, 129)' &&
        currentBgColor !== 'rgb(239, 68, 68)'
      ) {
        setToolboxStyle(prev => ({
          ...prev,
          backgroundColor: 'white',
          transform: 'scale(1)'
        }));
      } else {
        setToolboxStyle(prev => ({
          ...prev,
          transform: 'scale(1)'
        }));
      }
    }
  }, [isLoading, toolboxStyle.backgroundColor]);

  // 툴박스 클릭 핸들러
  const handleToolboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleScrap();
  }, [handleScrap]);

  // 뷰포트 변화 감지
  const debouncePositionUpdate = useCallback((() => {
    let timeoutId: number;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (!isDragging) {
          positionToolbox();
        }
      }, 100);
    };
  })(), [isDragging, positionToolbox]);

  // 이벤트 리스너 설정
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 뷰포트 리사이즈 감지
  useEffect(() => {
    const handleResize = () => {
      debouncePositionUpdate();
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver 설정
    resizeObserverRef.current = new ResizeObserver(() => {
      debouncePositionUpdate();
    });

    if (document.documentElement) {
      resizeObserverRef.current.observe(document.documentElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [debouncePositionUpdate]);

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      checkYouTubeFullscreen();
    };

    // 초기 상태 확인
    checkYouTubeFullscreen();

    // 전체화면 변경 이벤트 리스너
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // 유튜브 전체화면 버튼 클릭 감지
    const observer = new MutationObserver(() => {
      checkYouTubeFullscreen();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed']
    });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      observer.disconnect();
    };
  }, [checkYouTubeFullscreen]);

  // 초기 툴박스 위치 설정
  useEffect(() => {
    const timer = setTimeout(() => {
      positionToolbox();
    }, 100);

    return () => clearTimeout(timer);
  }, [positionToolbox]);

  // 버튼이 숨겨져야 하는 경우 렌더링하지 않음
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* 메인 플로팅 버튼 */}
      <button
        ref={buttonRef}
        id="tyquill-floating-button"
        className={`${styles.floatingButton} ${isDragging ? styles.dragging : ''} ${hasMoved ? styles.moved : ''}`}
        style={{
          ...buttonPosition,
          ...buttonStyle
        }}
        onMouseEnter={() => {
          if (!isDragging && !isLoading && !isToolboxActive) {
            handleHover(true);
          }
        }}
        onMouseLeave={() => {
          if (!isDragging && !isLoading && !isToolboxActive) {
            handleHover(false);
          }
        }}
        onMouseDown={handleMouseDown}
        onClick={handleButtonClick}
      >
        <img
          ref={imgRef}
          src="https://4bvbvpozg7fnspb5.public.blob.vercel-storage.com/Gemini_Generated_Image_y6f5u2y6f5u2y6f5.png"
          className={styles.logoImage}
          draggable={false}
        />
        {/* 텍스트 제거 - 버튼 최소 너비로 hover 효과 보장 */}
      </button>

      {/* 스크랩 툴박스 */}
      <div
        ref={toolboxRef}
        id="tyquill-toolbox"
        className={`tyquill-tool-item ${styles.toolbox}`}
        style={{
          border: `1px solid ${toolboxStyle.borderColor}`,
          ...toolboxPosition,
          ...toolboxStyle
        }}
        onMouseEnter={handleToolboxMouseEnter}
        onMouseLeave={handleToolboxMouseLeave}
        onClick={handleToolboxClick}
      >
        <BsBook
          size={18}
          className={`bi bi-book ${styles.toolboxIcon}`}
          aria-label="스크랩 툴박스"
          tabIndex={0}
          role="img"
        />
      </div>
    </>
  );
};

export default FloatingButton;