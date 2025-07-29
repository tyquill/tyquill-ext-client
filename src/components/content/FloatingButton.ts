export class FloatingButton {
  private button: HTMLButtonElement;
  private isDragging: boolean = false;
  private hasMoved: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialLeft: number = 0;
  private initialTop: number = 0;
  private readonly hiddenButtonWidth: number = 40;

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'tyquill-floating-button';

    const img = document.createElement('img');
    img.src = 'https://4bvbvpozg7fnspb5.public.blob.vercel-storage.com/Gemini_Generated_Image_y6f5u2y6f5u2y6f5.png'
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.borderRadius = '4px';
    img.draggable = false;
    img.style.pointerEvents = 'none';

    const shortcut = document.createElement('span');
    shortcut.textContent = '스크랩';
    shortcut.style.fontSize = '12px';
    shortcut.style.opacity = '0.7';
    shortcut.style.pointerEvents = 'none';

    this.button.appendChild(img);
    this.button.appendChild(shortcut);

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

  private setupEventListeners() {
    this.button.addEventListener('mouseenter', () => {
      if (!this.isDragging) {
        this.handleHover(true);
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        this.handleHover(false);
      }
    });

    this.button.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    this.button.addEventListener('click', () => {
      if (!this.hasMoved) {
        console.log('Button clicked!');
      }
    });
  }

  private handleHover(isEntering: boolean) {
    const currentSide = this.getCurrentSide();
    
    if (currentSide === 'left') {
      // 왼쪽에 있을 때: 오른쪽으로 이동
      if (isEntering) {
        this.button.style.transform = `translateY(-50%) translateX(-${this.hiddenButtonWidth}px) scale(1.02)`;
      } else {
        this.button.style.transform = 'translateY(-50%) scale(1)';
      }
    } else {
      // 오른쪽에 있을 때: 왼쪽으로 이동
      if (isEntering) {
        this.button.style.transform = `translateY(-50%) translateX(${this.hiddenButtonWidth}px) scale(1.02)`;
      } else {
        this.button.style.transform = 'translateY(-50%) scale(1)';
      }
    }
  }

  private getCurrentSide(): 'left' | 'right' {
    const computedStyle = getComputedStyle(this.button);
    return computedStyle.left !== 'auto' && computedStyle.left !== ''
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

    this.button.style.cursor = 'grabbing';
    this.button.style.transition = 'none';

    // 드래그 시작할 때 모든 위치 스타일 초기화
    this.button.style.right = 'auto';
    this.button.style.left = `${this.initialLeft}px`;
    this.button.style.top = `${this.initialTop}px`;
    this.button.style.transform = 'none';

    e.preventDefault();
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    if (!this.hasMoved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      this.hasMoved = true;
    }

    const newLeft = this.initialLeft + deltaX;
    const newTop = this.initialTop + deltaY;

    const maxLeft = window.innerWidth - this.button.offsetWidth;
    const maxTop = window.innerHeight - this.button.offsetHeight;

    this.button.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
    this.button.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
  }

  private handleMouseUp() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.button.style.cursor = 'grab';
    this.button.style.transition =
      'left 0.3s ease, right 0.3s ease, transform 0.2s ease-in-out, border-radius 0.3s ease';

    const rect = this.button.getBoundingClientRect();
    const buttonCenterX = rect.left + rect.width / 2;
    const isLeftSide = buttonCenterX < window.innerWidth / 2;

    // 먼저 중앙으로 정렬
    this.button.style.top = '50%';
    this.button.style.transform = 'translateY(-50%)';

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
  }

  public show() {
    document.body.appendChild(this.button);
  }

  public hide() {
    if (this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }
}