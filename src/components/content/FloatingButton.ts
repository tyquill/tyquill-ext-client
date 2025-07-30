import { createScrapViaBackground } from '../../utils/scrapHelper';
import { quickClip } from '../../utils/webClipper';

export class FloatingButton {
  private button: HTMLButtonElement;
  private shortcutSpan: HTMLSpanElement;
  private toolbox!: HTMLDivElement;
  private scrapTool!: HTMLDivElement;
  private resizeObserver!: ResizeObserver;
  private isDragging: boolean = false;
  private hasMoved: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialLeft: number = 0;
  private initialTop: number = 0;
  private readonly hiddenButtonWidth: number = 40;
  private isLoading: boolean = false;
  private isToolboxActive: boolean = false;

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'tyquill-floating-button';

    const img = document.createElement('img');
    img.src =
      'https://4bvbvpozg7fnspb5.public.blob.vercel-storage.com/Gemini_Generated_Image_y6f5u2y6f5u2y6f5.png';
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.borderRadius = '4px';
    img.draggable = false;
    img.style.pointerEvents = 'none';

    this.shortcutSpan = document.createElement('span');
    this.shortcutSpan.textContent = 'Tyquill';
    this.shortcutSpan.style.fontSize = '12px';
    this.shortcutSpan.style.opacity = '0.7';
    this.shortcutSpan.style.pointerEvents = 'none';

    this.button.appendChild(img);
    this.button.appendChild(this.shortcutSpan);

    // 툴박스 생성
    this.createToolbox();

    // 초기 툴박스 위치 설정
    this.positionToolbox();

    // 기본 스타일 설정
    this.button.style.position = 'fixed';
    this.button.style.top = '50%';
    this.button.style.transform = 'translateY(-50%)';
    this.button.style.right = `-${this.hiddenButtonWidth}px`; // 초기 위치는 오른쪽
    this.button.style.zIndex = '1000000';
    this.button.style.display = 'flex';
    this.button.style.alignItems = 'center';
    this.button.style.cursor = 'grab';
    this.button.style.userSelect = 'none';
    this.button.style.whiteSpace = 'nowrap';
    this.button.style.gap = '6px';
    this.button.style.justifyContent = 'flex-start';
    this.button.style.height = '36px';
    this.button.style.padding = '0 8px';
    this.button.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    this.button.style.backgroundColor = 'white';
    this.button.style.borderRadius = '32px 0 0 32px';
    this.button.style.boxShadow =
      '0 3.2px 12px 0 rgba(0, 0, 0, 0.08), 0 5px 25px 0 rgba(0, 0, 0, 0.04)';
    this.button.style.transition =
      'right 0.3s ease, left 0.3s ease, transform 0.2s ease-in-out, border-radius 0.3s ease';
    this.button.style.width = 'auto';
    this.button.style.minWidth = 'fit-content';

    this.setupEventListeners();
  }

  /**
   * 툴박스 생성
   */
  private createToolbox() {
    // 툴박스를 스크랩 툴 자체로 사용 (컨테이너 제거)
    this.toolbox = document.createElement('div');
    this.toolbox.id = 'tyquill-toolbox';
    this.toolbox.className = 'tyquill-tool-item';
    this.toolbox.style.position = 'fixed';
    this.toolbox.style.zIndex = '999999';
    this.toolbox.style.display = 'flex';
    this.toolbox.style.alignItems = 'center';
    this.toolbox.style.justifyContent = 'center';
    this.toolbox.style.width = '36px';
    this.toolbox.style.height = '36px';
    this.toolbox.style.minWidth = '36px';
    this.toolbox.style.minHeight = '36px';
    this.toolbox.style.boxSizing = 'border-box';
    this.toolbox.style.borderRadius = '50%';
    this.toolbox.style.cursor = 'pointer';
    this.toolbox.style.transition =
      'background-color 0.2s ease, transform 0.2s ease, top 0.3s ease, left 0.3s ease, right 0.3s ease';
    this.toolbox.style.backgroundColor = 'white';
    this.toolbox.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    this.toolbox.style.color = '#333';
    this.toolbox.style.userSelect = 'none';
    this.toolbox.style.padding = '8px';
    this.toolbox.style.boxShadow =
      '0 3.2px 12px 0 rgba(0, 0, 0, 0.08), 0 5px 25px 0 rgba(0, 0, 0, 0.04)';
    this.toolbox.style.opacity = '1';
    this.toolbox.style.transform = 'scale(1)';
    this.toolbox.style.pointerEvents = 'auto';
    this.toolbox.style.visibility = 'visible';
    this.toolbox.draggable = false;
    
    // CSS 리셋 - 외부 스타일 영향 최소화
    this.toolbox.style.margin = '0';
    this.toolbox.style.fontSize = '0';
    this.toolbox.style.lineHeight = '1';
    this.toolbox.style.textAlign = 'center';
    this.toolbox.style.verticalAlign = 'baseline';
    this.toolbox.style.outline = 'none';
    this.toolbox.style.textDecoration = 'none';
    this.toolbox.style.fontFamily = 'inherit';
    this.toolbox.style.fontWeight = 'normal';
    this.toolbox.style.fontStyle = 'normal';

    // 스크랩 아이콘을 툴박스에 직접 추가
    this.toolbox.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-book" viewBox="0 0 16 16" style="display: block; flex-shrink: 0;">
        <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
      </svg>
    `;

    // 스크랩 툴을 툴박스로 설정
    this.scrapTool = this.toolbox;

    // 호버 효과
    this.toolbox.addEventListener('mouseenter', () => {
      this.isToolboxActive = true;
      this.toolbox.style.backgroundColor = '#f5f5f5';
      this.toolbox.style.transform = 'scale(1.05)';
    });
    this.toolbox.addEventListener('mouseleave', () => {
      this.isToolboxActive = false;
      // 로딩 중이 아닐 때만 배경색을 원래대로 되돌림 (성공/실패 상태 유지)
      if (!this.isLoading) {
        // 현재 배경색이 성공(초록) 또는 실패(빨강) 상태가 아닌 경우에만 흰색으로 변경
        const currentBgColor = this.toolbox.style.backgroundColor;
        if (
          currentBgColor !== 'rgb(16, 185, 129)' &&
          currentBgColor !== 'rgb(239, 68, 68)'
        ) {
          this.toolbox.style.backgroundColor = 'white';
        }
      }
      this.toolbox.style.transform = 'scale(1)';
    });

    // 클릭 이벤트
    this.toolbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleScrap();
    });
  }

  /**
   * 뷰포트 변화 감지 설정
   */
  private setupViewportObserver() {
    // 윈도우 리사이즈 이벤트 (사이드바 열림/닫힘 감지)
    window.addEventListener('resize', () => {
      this.debouncePositionUpdate();
    });

    // 뷰포트 크기 변화를 더 정확히 감지하기 위한 ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      this.debouncePositionUpdate();
    });

    this.resizeObserver.observe(document.documentElement);
  }

  /**
   * 위치 업데이트 디바운싱
   */
  private debouncePositionUpdate = (() => {
    let timeoutId: number;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (!this.isDragging) {
          this.positionToolbox();
        }
      }, 100);
    };
  })();

  private setupEventListeners() {
    this.button.addEventListener('mouseenter', () => {
      if (!this.isDragging && !this.isLoading && !this.isToolboxActive) {
        this.handleHover(true);
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.isDragging && !this.isLoading && !this.isToolboxActive) {
        this.handleHover(false);
      }
    });

    this.button.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // 메인 버튼 클릭 시 사이드패널 토글
    this.button.addEventListener('click', async () => {
      if (this.hasMoved) return;

      // background script에서 현재 상태 확인
      const currentState = await this.getSidePanelState();
      
      if (!currentState) {
        await this.openSidePanel();
      } else {
        await this.closeSidePanel();
      }
    });

    // 뷰포트 크기 변화 감지 (사이드바 열림/닫힘 포함)
    this.setupViewportObserver();
  }

  private handleHover(isEntering: boolean) {
    const currentSide = this.getCurrentSide();
    // 버튼이 초기 중앙 위치(50%)에 있는지 확인
    const yTransform = this.button.style.top === '50%' ? 'translateY(-50%)' : '';
    
    if (currentSide === 'left') {
      // 왼쪽에 숨어있을 때 (left: -40px): 오른쪽으로 나와야 함
      if (isEntering) {
        this.button.style.transform = `${yTransform} translateX(${this.hiddenButtonWidth}px) scale(1.02)`.trim();
      } else {
        this.button.style.transform = `${yTransform} scale(1)`.trim();
      }
    } else {
      // 오른쪽에 숨어있을 때 (right: -40px): 왼쪽으로 나와야 함
      if (isEntering) {
        this.button.style.transform = `${yTransform} translateX(-${this.hiddenButtonWidth}px) scale(1.02)`.trim();
      } else {
        this.button.style.transform = `${yTransform} scale(1)`.trim();
      }
    }
  }

  private getCurrentSide(): 'left' | 'right' {
    const computedStyle = getComputedStyle(this.button);
    // left 값이 설정되어 있고 'auto'가 아니면 왼쪽
    return computedStyle.right === 'auto' ||
      computedStyle.left == `-${this.hiddenButtonWidth}px`
      ? 'left'
      : 'right';
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.hasMoved = false;

    const rect = this.button.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    // 드래그 준비만 하고, 실제 스타일 변경은 움직임이 감지될 때
    e.preventDefault();
  }

  private applyDragStyles() {
    // 실제 드래그가 시작될 때만 스타일 변경
    this.button.style.cursor = 'grabbing';
    this.button.style.transition = 'none';

    // 드래그 시작할 때 모든 위치 스타일 초기화
    this.button.style.right = 'auto';
    this.button.style.left = `${this.initialLeft}px`;
    this.button.style.top = `${this.initialTop}px`;
    this.button.style.transform = 'none';

    // 드래그 중 스타일 변경 (원형, 텍스트 숨김)
    this.shortcutSpan.style.display = 'none';
    this.button.style.borderRadius = '50%';
    this.button.style.width = '40px';
    this.button.style.height = '40px';
    this.button.style.padding = '8px';
    this.button.style.justifyContent = 'center';

    // 툴박스 숨김
    this.toolbox.style.opacity = '0';
    this.toolbox.style.pointerEvents = 'none';
    this.toolbox.style.visibility = 'hidden';
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    // 드래그 임계값을 더 크게 설정 (10px)
    if (!this.hasMoved && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      this.hasMoved = true;
      // 실제 드래그가 시작될 때만 스타일 적용
      this.applyDragStyles();
    }

    // 실제로 움직임이 감지되었을 때만 위치 업데이트
    if (this.hasMoved) {
      const newLeft = this.initialLeft + deltaX;
      const newTop = this.initialTop + deltaY;

      const maxLeft = window.innerWidth - this.button.offsetWidth;
      const maxTop = window.innerHeight - this.button.offsetHeight;

      this.button.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
      this.button.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
    }
  }

  private handleMouseUp() {
    if (!this.isDragging) return;

    this.isDragging = false;
    
    // 실제로 드래그가 발생했을 때만 스타일 복원
    if (this.hasMoved) {
      this.button.style.cursor = 'grab';
      this.button.style.transition =
        'left 0.3s ease, right 0.3s ease, transform 0.2s ease-in-out, border-radius 0.3s ease, width 0.3s ease, height 0.3s ease, padding 0.3s ease';

      const rect = this.button.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const isLeftSide = buttonCenterX < window.innerWidth / 2;

      // 현재 Y 위치 유지 (중앙으로 강제 이동하지 않음)
      const currentTop = rect.top;
      this.button.style.top = `${currentTop}px`;
      this.button.style.transform = 'none';

      // 원래 버튼 스타일 복원
      this.shortcutSpan.style.display = 'inline';
      this.button.style.width = 'auto';
      this.button.style.height = '36px';
      this.button.style.padding = '0 8px';
      this.button.style.justifyContent = 'flex-start';
      this.button.style.gap = '6px';

      if (isLeftSide) {
        // 왼쪽에 붙이기
        this.button.style.right = 'auto';
        this.button.style.left = `-${this.hiddenButtonWidth}px`;
        this.button.style.borderRadius = '0 32px 32px 0';
        this.button.style.flexDirection = 'row-reverse';
      } else {
        // 오른쪽에 붙이기
        this.button.style.left = 'auto';
        this.button.style.right = `-${this.hiddenButtonWidth}px`;
        this.button.style.borderRadius = '32px 0 0 32px';
        this.button.style.flexDirection = 'row';
      }

      // 툴박스 다시 표시 및 위치 업데이트
      setTimeout(() => {
        this.toolbox.style.opacity = '1';
        this.toolbox.style.pointerEvents = 'auto';
        this.toolbox.style.visibility = 'visible';
        this.positionToolbox();
      }, 300); // 버튼 애니메이션 완료 후 실행
    }
  }

  /**
   * 툴박스 위치 계산 - 메인 버튼 바로 위에 고정
   */
  private positionToolbox() {
    const buttonRect = this.button.getBoundingClientRect();
    const gap = 16; // 버튼과 툴박스 사이 간격 증가
    const toolboxSize = 36;
    const viewportWidth = window.innerWidth;

    // 메인 버튼 내 이미지 요소 찾기
    const imgElement = this.button.querySelector('img') as HTMLImageElement;
    let logoCenterX: number;

    if (imgElement) {
      // 이미지 요소의 실제 위치를 기준으로 계산
      const imgRect = imgElement.getBoundingClientRect();
      logoCenterX = imgRect.left + imgRect.width / 2;
    } else {
      // 이미지를 찾을 수 없는 경우 버튼 중앙 사용
      logoCenterX = buttonRect.left + buttonRect.width / 2;
    }

    // 메인 버튼이 어느 쪽에 있는지 확인
    const currentSide = this.getCurrentSide();

    // 툴박스 left 위치 계산
    let toolboxLeft = logoCenterX - toolboxSize / 2;

    // 오른쪽에 있을 때 왼쪽으로 추가 보정
    if (currentSide === 'right') {
      toolboxLeft -= 5; // 왼쪽으로 12px 더 이동
    }

    // 뷰포트 경계 체크 및 조정
    const margin = 8; // 화면 가장자리로부터의 최소 여백
    if (toolboxLeft < margin) {
      // 왼쪽 경계를 벗어나는 경우
      toolboxLeft = margin;
    } else if (toolboxLeft + toolboxSize > viewportWidth - margin) {
      // 오른쪽 경계를 벗어나는 경우
      toolboxLeft = viewportWidth - toolboxSize - margin;
    }

    // 툴박스 위치 적용
    this.toolbox.style.left = `${toolboxLeft}px`;
    this.toolbox.style.top = `${buttonRect.top - toolboxSize - gap}px`;
    this.toolbox.style.right = 'auto';
    this.toolbox.style.bottom = 'auto';
  }

  /**
   * 사이드패널 상태 확인
   */
  private async getSidePanelState(): Promise<boolean> {
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
  }

  /**
   * 사이드패널 열기 (background script를 통해)
   */
  private async openSidePanel(): Promise<boolean> {
    try {
      // background script에 사이드패널 열기 요청
      const response = await chrome.runtime.sendMessage({
        action: 'openSidePanel',
      });

      if (response?.success) {
        return true;
      } else {
        console.error(
          '❌ Content: Failed to open side panel:',
          response?.error
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Content: Failed to send message to background:', error);
      return false;
    }
  }

  /**
   * 사이드패널 닫기 (사이드패널에 직접 메시지 전송)
   */
  private async closeSidePanel(): Promise<boolean> {
    try {
      // 사이드패널에 직접 닫기 요청
      const response = await chrome.runtime.sendMessage({
        action: 'closeSidePanel',
      });

      if (response?.success) {
        return true;
      } else {
        console.error(
          '❌ Content: Failed to close side panel:',
          response?.error
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Content: Failed to send message to background:', error);
      return false;
    }
  }



  /**
   * 스크랩 처리
   */
  private async handleScrap() {
    if (this.isLoading) return;

    try {
      this.setLoadingState(true);

      // 현재 페이지 콘텐츠 클립
      const scrapResult = await quickClip();

      // 공통 헬퍼를 통해 스크랩 생성
      const response = await createScrapViaBackground(scrapResult);

      this.showSuccessState();
    } catch (error) {
      this.showErrorState();
      console.error('❌ 스크랩 실패:', error);
    } finally {
      this.setLoadingState(false);

      // 3초 후 원래 상태로 복원
      setTimeout(() => {
        this.resetState();
      }, 3000);
    }
  }

  /**
   * 로딩 상태 설정
   */
  private setLoadingState(loading: boolean) {
    this.isLoading = loading;

    if (loading) {
      // 스크랩 툴만 상태 업데이트 (메인 버튼은 건드리지 않음)
      this.scrapTool.style.opacity = '0.7';
      this.scrapTool.style.pointerEvents = 'none';
      this.scrapTool.style.cursor = 'wait';
    }
  }

  /**
   * 성공 상태 표시
   */
  private showSuccessState() {
    // 스크랩 툴만 상태 변경 (메인 버튼은 건드리지 않음)
    this.scrapTool.style.backgroundColor = '#10b981';
    this.scrapTool.style.color = 'white';
    this.scrapTool.style.borderColor = '#10b981';
  }

  /**
   * 에러 상태 표시
   */
  private showErrorState() {
    // 스크랩 툴만 상태 변경 (메인 버튼은 건드리지 않음)
    this.scrapTool.style.backgroundColor = '#ef4444';
    this.scrapTool.style.color = 'white';
    this.scrapTool.style.borderColor = '#ef4444';
  }

  /**
   * 원래 상태로 복원
   */
  private resetState() {
    // 스크랩 툴만 상태 복원 (메인 버튼은 건드리지 않음)
    this.scrapTool.style.backgroundColor = 'white';
    this.scrapTool.style.color = '#333';
    this.scrapTool.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    this.scrapTool.style.opacity = '1';
    this.scrapTool.style.pointerEvents = 'auto';
    this.scrapTool.style.cursor = 'pointer';
  }

  public show() {
    document.body.appendChild(this.button);
    document.body.appendChild(this.toolbox);

    // 툴박스가 확실히 표시되도록 강제 설정
    this.toolbox.style.display = 'flex';
    this.toolbox.style.opacity = '1';
    this.toolbox.style.pointerEvents = 'auto';
    this.toolbox.style.visibility = 'visible';

    // 위치 재계산
    setTimeout(() => {
      this.positionToolbox();
    }, 100);
  }

  public hide() {
    if (this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    if (this.toolbox.parentNode) {
      this.toolbox.parentNode.removeChild(this.toolbox);
    }

    // Observer 정리
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
