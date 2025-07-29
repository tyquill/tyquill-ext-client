/**
 * 스크랩 관련 공통 타입 정의
 */

import { ScrapResult } from '../utils/webClipper';

/**
 * 확장된 스크랩 결과 (태그 정보 포함)
 */
export interface ExtendedScrapResult extends ScrapResult {
  tags?: string[];
}

/**
 * 스크랩 요청 메시지
 */
export interface ScrapRequestMessage {
  action: 'createScrap';
  data: ExtendedScrapResult;
}

/**
 * 스크랩 응답 메시지
 */
export interface ScrapResponseMessage {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 스크랩 상태 타입
 */
export type ScrapStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 스크랩 상태 인터페이스
 */
export interface ScrapState {
  status: ScrapStatus;
  isLoading: boolean;
  error?: string;
  data?: any;
}

/**
 * Content Script 메시지 타입
 */
export interface ContentScriptMessage {
  type: 'PING' | 'CLIP_PAGE';
  options?: {
    includeMetadata?: boolean;
    selectionOnly?: boolean;
  };
}

/**
 * Content Script 응답 타입
 */
export interface ContentScriptResponse {
  success: boolean;
  data?: ScrapResult;
  error?: string;
}