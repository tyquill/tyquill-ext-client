// Content Script 메시지 타입
export interface ContentScriptMessage {
  type: 'CLIP_PAGE' | 'GET_PAGE_INFO' | 'CHECK_SELECTION' | 'PASTE_TO_MAILY' | 'PING';
  options?: any;
  content?: string;
}

// Content Script 응답 타입
export interface ContentScriptResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// 페이지 정보 타입
export interface PageInfo {
  title: string;
  url: string;
  hostname: string;
  pathname: string;
  description: string;
  author: string;
  publishedDate: string;
  favicon: string;
  hasSelection: boolean;
  wordCount: number;
}

// 선택된 텍스트 정보 타입
export interface SelectionInfo {
  hasSelection: boolean;
  selectedText: string;
  selectedLength: number;
}

// 스크랩 결과 타입
export interface ClipResult {
  success: boolean;
  data?: any;
  error?: string;
}

// FloatingButton 위치 타입
export interface Position {
  x: number;
  y: number;
}

// FloatingButton 상태 타입
export interface FloatingButtonState {
  isDragging: boolean;
  hasMoved: boolean;
  isLoading: boolean;
  isToolboxActive: boolean;
  isHovered: boolean;
  currentSide: 'left' | 'right';
  position: Position;
}

// Content Script 훅 반환 타입
export interface UseContentScriptReturn {
  isReady: boolean;
  currentSelection: SelectionInfo;
  handleClipPage: (options?: any) => Promise<ClipResult>;
  handleGetPageInfo: () => Promise<ClipResult>;
  handlePasteToMaily: (content: string) => Promise<ClipResult>;
}

// FloatingButton Props 타입
export interface FloatingButtonProps {
  className?: string;
}

// 스크랩 옵션 타입
export interface ClipOptions {
  includeImages?: boolean;
  includeLinks?: boolean;
  maxLength?: number;
  format?: 'markdown' | 'html' | 'text';
}

// 마크다운 변환 옵션 타입
export interface MarkdownOptions {
  includeHeaders?: boolean;
  includeLists?: boolean;
  includeCode?: boolean;
  includeQuotes?: boolean;
} 