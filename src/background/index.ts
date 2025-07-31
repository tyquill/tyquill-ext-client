// Background Service Worker for Tyquill Extension
import { scrapService } from '../services/scrapService';

// 사이드패널 상태 (전역)
let isSidePanelOpen = false;

chrome.runtime.onInstalled.addListener(() => {
  // console.log('Tyquill Extension installed');
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  // console.log('Extension icon clicked');
  
  // Open side panel
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    // console.log('Side panel opened');
  } catch (error) {
    // console.error('Failed to open side panel:', error);
  }
});

chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  // Handle messages from content script or popup
  // console.log('Message received:', request);
  

  if (request.action === 'clipAndScrapCurrentPage') {
    handleClipAndScrapCurrentPage(sender)
      .then(response => {
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('❌ Background clip and scrap error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will respond asynchronously
    return true;
  }
  
  if (request.action === 'openSidePanel') {
    handleOpenSidePanel(sender)
      .then(() => {
        isSidePanelOpen = true;
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Background side panel error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will respond asynchronously
    return true;
  }

  if (request.action === 'closeSidePanel') {
    // 사이드패널에 닫기 메시지 전달
    isSidePanelOpen = false;
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getSidePanelState') {
    sendResponse({ success: true, isOpen: isSidePanelOpen });
    return true;
  }

  if (request.action === 'sidePanelClosed') {
    // 사이드패널이 닫혔음을 알림
    isSidePanelOpen = false;
    sendResponse({ success: true });
    return true;
  }

});

/**
 * 사이드패널 열기 처리
 */
async function handleOpenSidePanel(sender: chrome.runtime.MessageSender) {
  try {
    if (sender.tab?.id) {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
    } else {
      throw new Error('No tab ID available');
    }
  } catch (error) {
    console.error('❌ Background: Failed to open side panel:', error);
    throw error;
  }
}


/**
 * 현재 페이지 클리핑 및 스크랩 처리 (Background Script에서 실행)
 */
async function handleClipAndScrapCurrentPage(sender: chrome.runtime.MessageSender) {
  try {
    // 현재 활성 탭 정보 가져오기
    let tabId = sender.tab?.id;
    
    // Sidepanel에서 요청하는 경우 sender.tab이 없으므로 활성 탭을 쿼리
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }
    
    if (!tabId) {
      throw new Error('No active tab found');
    }

    const tab = await chrome.tabs.get(tabId);
    
    // URL 체크 - 제한된 페이지에서는 스크랩 불가
    if (tab.url?.startsWith('chrome://') || 
        tab.url?.startsWith('chrome-extension://') ||
        tab.url?.startsWith('edge://') ||
        tab.url?.startsWith('about:')) {
      throw new Error('이 페이지에서는 스크랩할 수 없습니다. (chrome://, extension:// 등 제한된 페이지)');
    }

    // Content Script가 로드되었는지 확인
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch (pingError) {
      // Content script 수동 주입 시도
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['contentScript/index.js']
      });
      
      // 잠시 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Content Script로 클리핑 요청
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CLIP_PAGE',
      options: { includeMetadata: true }
    });

    if (!response.success) {
      throw new Error(response.error || 'Clipping failed');
    }

    // 스크랩 데이터 생성
    const scrapResult = {
      ...response.data,
    };

    // 스크랩 생성
    const tags = (scrapResult as any).tags || [];
    const result = await scrapService.quickScrap(
      scrapResult,
      '', // userComment
      tags // tags
    );
    
    // 성공 시 sidepanel에 새로고침 알림
    try {
      chrome.runtime.sendMessage({
        action: 'scrapCreated',
        data: result
      });
    } catch (error) {
      // sidepanel이 열려있지 않을 수 있으므로 에러 무시
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Background: Clip and scrap failed:', error);
    throw error;
  }
}


export {}; 