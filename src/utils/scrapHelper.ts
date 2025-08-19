/**
 * Scrap Helper Utility
 * 
 * @description Chrome Extension에서 CORS 문제 없이 스크랩 기능을 사용하기 위한 헬퍼
 * Background script를 통해 API 요청을 처리합니다.
 */

import { 
  ScrapStatus,
  ScrapState
} from '../types/scrapTypes';
import { browser } from 'wxt/browser';

// 타입 재export (편의를 위해)
export type { ScrapStatus, ScrapState };


/**
 * 현재 페이지를 스크랩하는 통합 함수
 * - Background script에서 클리핑 및 스크랩 처리
 * - FloatingButton과 ScrapPage에서 공통으로 사용 가능
 */
export async function clipAndScrapCurrentPage(): Promise<any> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(
      { action: 'clipAndScrapCurrentPage' },
      (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      }
    );
  });
}

/**
 * 문체 관리를 위한 현재 페이지 클리핑 함수
 * - 스크랩 API를 호출하지 않고 클리핑만 수행
 * - StyleManagementPage에서 사용
 */
export async function clipCurrentPageForStyle(): Promise<any> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(
      { action: 'clipCurrentPageForStyle' },
      (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      }
    );
  });
}

/**
 * 초기 스크랩 상태
 */
export const initialScrapState: ScrapState = {
  status: 'idle',
  isLoading: false,
  error: undefined,
  data: undefined
};

/**
 * 스크랩 상태 업데이트 헬퍼
 */
export const scrapStateHelpers = {
  loading: (): ScrapState => ({
    status: 'loading',
    isLoading: true,
    error: undefined,
    data: undefined
  }),
  
  success: (data: any): ScrapState => ({
    status: 'success',
    isLoading: false,
    error: undefined,
    data
  }),
  
  error: (error: string): ScrapState => ({
    status: 'error',
    isLoading: false,
    error,
    data: undefined
  }),
  
  idle: (): ScrapState => initialScrapState
};