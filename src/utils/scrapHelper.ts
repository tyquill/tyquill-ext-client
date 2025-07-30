/**
 * Scrap Helper Utility
 * 
 * @description Chrome Extension에서 CORS 문제 없이 스크랩 기능을 사용하기 위한 헬퍼
 * Background script를 통해 API 요청을 처리합니다.
 */

import { ScrapResult } from './webClipper';
import { 
  ExtendedScrapResult, 
  ScrapRequestMessage, 
  ScrapResponseMessage,
  ScrapStatus,
  ScrapState,
  ContentScriptMessage,
  ContentScriptResponse
} from '../types/scrapTypes';

// 타입 재export (편의를 위해)
export type { ScrapStatus, ScrapState };

/**
 * Background script를 통해 스크랩 생성
 */
export async function createScrapViaBackground(scrapResult: ScrapResult): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        action: 'createScrap', 
        data: scrapResult 
      } as ScrapRequestMessage,
      (response: ScrapResponseMessage) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
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
 * 현재 탭에서 페이지 클리핑 후 스크랩 생성
 */
export async function clipAndScrapCurrentPage(selectedTags: string[] = []): Promise<any> {
  // 현재 활성 탭 정보 가져오기
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  // URL 체크 - 제한된 페이지에서는 스크랩 불가
  if (tab.url?.startsWith('chrome://') || 
      tab.url?.startsWith('chrome-extension://') ||
      tab.url?.startsWith('edge://') ||
      tab.url?.startsWith('about:')) {
    throw new Error('이 페이지에서는 스크랩할 수 없습니다. (chrome://, extension:// 등 제한된 페이지)');
  }

  // Content Script가 로드되었는지 확인
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
  } catch (pingError) {
    // Content script 수동 주입 시도
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript/index.js']
    });
    
    // 잠시 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Content Script로 클리핑 요청
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'CLIP_PAGE',
    options: { includeMetadata: true }
  });

  if (!response.success) {
    throw new Error(response.error || 'Clipping failed');
  }

  // 태그 정보 추가
  const scrapResult = {
    ...response.data,
    tags: selectedTags
  };

  // Background script를 통해 스크랩 생성
  return await createScrapViaBackground(scrapResult);
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