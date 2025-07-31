
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createScrapViaBackground } from '../../../utils/scrapHelper';
import { quickClip } from '../../../utils/webClipper';

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
  const shortcutSpanRef = useRef<HTMLSpanElement>(null);
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

  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hiddenButtonWidth = 40;

  // 툴박스 위치 계산
  const positionToolbox = useCallback(() => {
    if (!buttonRef.current || !toolboxRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const gap = 16;
    const toolboxSize = 36;
    const viewportWidth = window.innerWidth;

    let logoCenterX: number;

    if (imgRef.current) {
      const imgRect = imgRef.current.getBoundingClientRect();
      logoCenterX = imgRect.left + imgRect.width / 2;
    } else {
      logoCenterX = buttonRect.left + buttonRect.width / 2;
    }

    const currentSide = getCurrentSide();
    let toolboxLeft = logoCenterX - toolboxSize / 2;

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

      setToolboxStyle(prev => ({
        ...prev,
        opacity: 0,
        pointerEvents: 'none'
      }));
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

      const scrapResult = await quickClip();
      const response = await createScrapViaBackground(scrapResult);

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

  // 초기 툴박스 위치 설정
  useEffect(() => {
    const timer = setTimeout(() => {
      positionToolbox();
    }, 100);

    return () => clearTimeout(timer);
  }, [positionToolbox]);

  return (
    <>
      {/* 메인 플로팅 버튼 */}
      <button
        ref={buttonRef}
        id="tyquill-floating-button"
        style={{
          position: 'fixed',
          zIndex: 1000000,
          display: 'flex',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          backgroundColor: 'white',
          boxShadow: '0 3.2px 12px 0 rgba(0, 0, 0, 0.08), 0 5px 25px 0 rgba(0, 0, 0, 0.04)',
          transition: isDragging ? 'none' : 'right 0.3s ease, left 0.3s ease, transform 0.2s ease-in-out, border-radius 0.3s ease, width 0.3s ease, height 0.3s ease, padding 0.3s ease',
          minWidth: hasMoved ? '40px' : '80px', // 드래그 시에는 40px, 일반 시에는 80px
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
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
        {/* 텍스트 제거 - 버튼 최소 너비로 hover 효과 보장 */}
      </button>

      {/* 스크랩 툴박스 */}
      <div
        ref={toolboxRef}
        id="tyquill-toolbox"
        className="tyquill-tool-item"
        style={{
          position: 'fixed',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          minWidth: '36px',
          minHeight: '36px',
          boxSizing: 'border-box',
          borderRadius: '50%',
          transition: 'background-color 0.2s ease, transform 0.2s ease, top 0.3s ease, left 0.3s ease, right 0.3s ease',
          border: `1px solid ${toolboxStyle.borderColor}`,
          userSelect: 'none',
          padding: '8px',
          boxShadow: '0 3.2px 12px 0 rgba(0, 0, 0, 0.08), 0 5px 25px 0 rgba(0, 0, 0, 0.04)',
          visibility: 'visible',
          margin: '0',
          fontSize: '0',
          lineHeight: '1',
          textAlign: 'center',
          verticalAlign: 'baseline',
          outline: 'none',
          textDecoration: 'none',
          fontFamily: 'inherit',
          fontWeight: 'normal',
          fontStyle: 'normal',
          ...toolboxPosition,
          ...toolboxStyle
        }}
        onMouseEnter={handleToolboxMouseEnter}
        onMouseLeave={handleToolboxMouseLeave}
        onClick={handleToolboxClick}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          fill="currentColor" 
          className="bi bi-book" 
          viewBox="0 0 16 16" 
          style={{ display: 'block', flexShrink: 0 }}
        >
          <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
        </svg>
      </div>
    </>
  );
};

export default FloatingButton;