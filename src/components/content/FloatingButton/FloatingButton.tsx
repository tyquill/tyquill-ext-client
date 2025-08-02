
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clipAndScrapCurrentPage } from '../../../utils/scrapHelper';
import styles from './FloatingButton.module.css';
import { BsBook } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import { IoMdCheckmark } from 'react-icons/io';
import { motion } from 'framer-motion';

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

type ToolGroup = {
  id: string;
  tools: Tool[];
  position: 'top' | 'bottom';
};

type Tool = {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  shortcut?: string;
  tooltip?: string;
  disabled?: boolean;
};

const FloatingButton: React.FC = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const [buttonPosition, setButtonPosition] = useState({
    top: '50%',
    right: '-40px',
    left: 'auto',
    transform: 'translateY(-50%)'
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
  
  const [toolbarStyle, setToolbarStyle] = useState<ToolboxStyle>({
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
  const hiddenButtonWidth = 40;



  // 툴 그룹 정의는 handleScrap 함수 정의 후에 이동

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

  // 툴바 위치 계산 (CSS left/right 속성 사용)
  const positionToolbar = useCallback(() => {
    if (!buttonRef.current || !toolbarRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    
    // 버튼의 실제 위치를 기반으로 오른쪽/왼쪽 판단
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const isRightSide = buttonCenterX > window.innerWidth / 2;
    
    // 툴바를 메인 버튼 위에 배치
    const toolbarTop = buttonRect.top - 44; // 툴바 높이(36px) + 간격(8px)

    // CSS left/right 속성으로 툴바 위치 설정
    if (isRightSide) {
      // 오른쪽에 있을 때는 right: 0; left: auto;
      toolbarRef.current.style.right = '0';
      toolbarRef.current.style.left = 'auto';
    } else {
      // 왼쪽에 있을 때는 left: 0; right: auto;
      toolbarRef.current.style.left = '0';
      toolbarRef.current.style.right = 'auto';
    }
    
    toolbarRef.current.style.top = `${toolbarTop}px`;
  }, []);

  // 호버 효과 처리
  const handleHover = useCallback((isEntering: boolean) => {
    const currentSide = getCurrentSide();
    // 드래그 후에도 translateY(-50%)를 유지하기 위해 조건 수정
    const yTransform = buttonPosition.top === '50%' || buttonPosition.transform?.includes('translateY(-50%)') ? 'translateY(-50%)' : '';
    
    if (currentSide === 'left') {
      if (isEntering) {
        const transforms = [yTransform, `translateX(${hiddenButtonWidth}px)`, 'scale(1.02)'].filter(Boolean);
        setButtonPosition(prev => ({
          ...prev,
          transform: transforms.join(' ')
        }));
      } else {
        const transforms = [yTransform, 'scale(1)'].filter(Boolean);
        setButtonPosition(prev => ({
          ...prev,
          transform: transforms.join(' ')
        }));
      }
    } else {
      if (isEntering) {
        const transforms = [yTransform, `translateX(-${hiddenButtonWidth}px)`, 'scale(1.02)'].filter(Boolean);
        setButtonPosition(prev => ({
          ...prev,
          transform: transforms.join(' ')
        }));
      } else {
        const transforms = [yTransform, 'scale(1)'].filter(Boolean);
        setButtonPosition(prev => ({
          ...prev,
          transform: transforms.join(' ')
        }));
      }
    }
  }, [buttonPosition.top, buttonPosition.transform, getCurrentSide]);

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
      
      // 실제 드래그가 시작될 때 툴바 완전히 숨기기
      if (toolbarRef.current) {
        toolbarRef.current.style.opacity = '0';
        toolbarRef.current.style.pointerEvents = 'none';
        toolbarRef.current.style.visibility = 'hidden';
      }
      
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

      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const finalTop = Math.max(0, Math.min(newTop, maxTop));

      setButtonPosition({
        top: `${finalTop}px`,
        left: `${finalLeft}px`,
        right: 'auto',
        transform: 'none'
      });

      // 드래그 중에는 툴바 숨기기 (이미 handleMouseMove에서 처리됨)
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

      // 툴바 다시 표시
      setTimeout(() => {
        if (toolbarRef.current) {
          // 툴바 직접 표시
          toolbarRef.current.style.opacity = '1';
          toolbarRef.current.style.pointerEvents = 'auto';
          toolbarRef.current.style.visibility = 'visible';
          
          // 버튼 위치 상태 업데이트 후 툴바 위치 업데이트
          if (buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            
            // 버튼의 실제 위치를 기반으로 오른쪽/왼쪽 판단
            const buttonCenterX = buttonRect.left + buttonRect.width / 2;
            const isRightSide = buttonCenterX > window.innerWidth / 2;
            
            const toolbarTop = buttonRect.top - 44;
            
            // CSS left/right 속성으로 툴바 위치 설정
            if (isRightSide) {
              // 오른쪽에 있을 때는 right: 0; left: auto;
              toolbarRef.current.style.right = '0';
              toolbarRef.current.style.left = 'auto';
            } else {
              // 왼쪽에 있을 때는 left: 0; right: auto;
              toolbarRef.current.style.left = '0';
              toolbarRef.current.style.right = 'auto';
            }
            
            toolbarRef.current.style.top = `${toolbarTop}px`;
          }
        }
      }, 300);
    } else if (!hasMoved) {
      // 단순 클릭인 경우 - 툴박스가 숨겨지지 않았으므로 아무것도 하지 않음
      // 툴박스는 이미 보이는 상태를 유지
    }
  }, [isDragging, hasMoved]);

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
      setToolbarStyle(prev => ({
        ...prev,
        opacity: 0.7,
        pointerEvents: 'none',
        cursor: 'wait'
      }));

      await clipAndScrapCurrentPage();

      // 성공 애니메이션 표시
      setShowSuccessAnimation(true);
      
      // 성공 상태
      setToolbarStyle(prev => ({
        ...prev,
        backgroundColor: '#10b981',
        color: 'white',
        borderColor: '#10b981'
      }));
    } catch (error) {
      // 에러 상태
      setToolbarStyle(prev => ({
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
        setToolbarStyle({
          backgroundColor: 'white',
          color: '#333',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          opacity: 1,
          pointerEvents: 'auto',
          cursor: 'pointer'
        });
        setShowSuccessAnimation(false);
      }, 3000);
    }
  }, [isLoading]);

  // 툴 그룹 정의 (handleScrap 함수 정의 후)
  const toolGroups: ToolGroup[] = [
    {
      id: 'main',
      position: 'top',
      tools: [
        {
          id: 'scrap',
          icon: <BsBook size={18} />,
          label: '스크랩',
          action: handleScrap,
          shortcut: '⌘S',
          tooltip: '현재 페이지를 스크랩합니다'
        }
      ]
    }
  ];

  // 메인 버튼 클릭 핸들러
  const handleButtonClick = useCallback(async () => {
    if (hasMoved || isDragging) return;

    const currentState = await getSidePanelState();
    
    if (!currentState) {
      await openSidePanel();
    } else {
      await closeSidePanel();
    }
  }, [hasMoved, isDragging, getSidePanelState, openSidePanel, closeSidePanel]);



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

  // 툴 클릭 핸들러
  const handleToolClick = useCallback((tool: Tool) => {
    if (tool.disabled) return;
    tool.action();
  }, []);

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

  // 초기 버튼 위치 상태 설정 및 버튼 표시 상태 변경 시 툴바 위치 재계산
  useEffect(() => {
    const timer = setTimeout(() => {
      // 초기 버튼 위치 상태 설정
      getCurrentSide();
      // 툴바 위치 설정
      positionToolbar();
    }, 100);

    return () => clearTimeout(timer);
  }, [getCurrentSide, positionToolbar, settings.floatingButtonVisible]);



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
          if (!isDragging && !isLoading) {
            handleHover(true);
          }
        }}
        onMouseLeave={() => {
          if (!isDragging && !isLoading) {
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

      {/* Monica 스타일 툴바 */}
      <div
        ref={toolbarRef}
        id="tyquill-toolbar"
        className={styles.toolbar}
        style={{
          opacity: 1,
          pointerEvents: 'auto'
        }}
      >
        <div className={styles.toolGroup}>
          {toolGroups.map((group) => (
            <div key={group.id} className={styles.wrapper}>
              <div className={styles.expandActionTool}>
                {group.tools.map((tool) => (
                  <motion.div 
                    key={tool.id} 
                    className={styles.nodeWrapper}
                    onClick={() => handleToolClick(tool)}
                    title={tool.tooltip}
                    animate={showSuccessAnimation && tool.id === 'scrap' ? {
                      scale: [1, 1.2, 1],
                      backgroundColor: ["#ffffff", "#10b981", "#ffffff"],
                    } : {}}
                    transition={{
                      duration: 0.8,
                      ease: "easeOut"
                    }}
                  >
                    <motion.div 
                      className={styles.actionMenuInner}
                      animate={showSuccessAnimation && tool.id === 'scrap' ? {
                        color: ["#666", "#ffffff", "#666"]
                      } : {}}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut"
                      }}
                    >
                      {showSuccessAnimation && tool.id === 'scrap' ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <IoMdCheckmark size={18} />
                        </motion.div>
                      ) : (
                        tool.icon
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
};

export default FloatingButton;