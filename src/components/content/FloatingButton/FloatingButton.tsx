
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clipAndScrapCurrentPage } from '../../../utils/scrapHelper';
import styles from './FloatingButton.module.css';
import { BsBook } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';

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

  const [settings, setSettings] = useState({
    floatingButtonVisible: true
  });

  const [buttonSide, setButtonSide] = useState<'left' | 'right'>('right');
  const [closeButtonPosition, setCloseButtonPosition] = useState({
    left: 'auto',
    right: '-6px'
  });

  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hiddenButtonWidth = 40;

  // 설정 로드 및 변경 감지
  useEffect(() => {
    const loadSettings = () => {
      chrome.storage.sync.get(['tyquillSettings'], (result) => {
        if (result.tyquillSettings) {
          setSettings(prev => ({ ...prev, ...result.tyquillSettings }));
        }
      });
    };

    // 초기 설정 로드
    loadSettings();

    // 설정 변경 감지 (Chrome Storage)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.tyquillSettings) {
        setSettings(prev => ({ ...prev, ...changes.tyquillSettings.newValue }));
      }
    };

    // 설정 변경 감지 (CustomEvent - Context Menu에서 변경 시)
    const handleSettingsChanged = (event: CustomEvent) => {
      if (event.detail) {
        setSettings(prev => ({ ...prev, ...event.detail }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener('tyquill-settings-changed', handleSettingsChanged as EventListener);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      window.removeEventListener('tyquill-settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);

  // 현재 버튼 위치 확인 및 상태 업데이트
  const getCurrentSide = useCallback((): 'left' | 'right' => {
    if (!buttonRef.current) return 'right';
    const computedStyle = getComputedStyle(buttonRef.current);
    const currentSide = computedStyle.right === 'auto' ||
      computedStyle.left === `-${hiddenButtonWidth}px`
      ? 'left'
      : 'right';
    
    // 상태 업데이트
    setButtonSide(currentSide);
    return currentSide;
  }, []);

  // 닫기 버튼 위치 업데이트
  const updateCloseButtonPosition = useCallback(() => {
    setCloseButtonPosition({
      left: buttonSide === 'left' ? 'auto' : '-6px',
      right: buttonSide === 'left' ? '-6px' : 'auto'
    });
  }, [buttonSide]);

  // 버튼 위치 변경 시 닫기 버튼 위치 업데이트
  useEffect(() => {
    updateCloseButtonPosition();
  }, [buttonSide, updateCloseButtonPosition]);

  // 설정 변경 시 hover 상태 리셋
  useEffect(() => {
    if (settings.floatingButtonVisible) {
      // 플로팅 버튼이 다시 표시될 때 hover 상태 리셋
      setButtonPosition(prev => ({
        ...prev,
        transform: prev.top === '50%' ? 'translateY(-50%)' : 'none'
      }));
    }
  }, [settings.floatingButtonVisible]);

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
        // 버튼 위치 상태 업데이트
        getCurrentSide();
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

  // 닫기 버튼 클릭 핸들러
  const handleCloseButtonClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // 설정을 false로 변경
      const currentSettings = await chrome.storage.sync.get(['tyquillSettings']);
      const updatedSettings = {
        ...currentSettings.tyquillSettings,
        floatingButtonVisible: false
      };
      
      await chrome.storage.sync.set({
        tyquillSettings: updatedSettings
      });
      
      console.log('플로팅 버튼 숨김 설정 저장됨');
    } catch (error) {
      console.error('플로팅 버튼 숨김 설정 실패:', error);
    }
  }, []);

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
      // 초기 버튼 위치 상태 설정
      getCurrentSide();
    }, 100);

    return () => clearTimeout(timer);
  }, [positionToolbox, getCurrentSide]);

  // 버튼이 숨겨져야 하는 경우 렌더링하지 않음
  if (!settings.floatingButtonVisible) {
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
        
        {/* 닫기 버튼 - 호버 시에만 표시 */}
        <button
          className={styles.closeButton}
          style={closeButtonPosition}
          onClick={handleCloseButtonClick}
          aria-label="플로팅 버튼 숨기기"
          title="플로팅 버튼 숨기기"
        >
          <IoClose size={12} />
        </button>
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