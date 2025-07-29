// Background Service Worker for Tyquill Extension
import { scrapService } from '../services/scrapService';
import { ScrapResult } from '../utils/webClipper';

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
  
  if (request.action === 'createScrap') {
    handleScrapRequest(request.data)
      .then(response => {
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('❌ Background scrap error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will respond asynchronously
    return true;
  }
  
  if (request.action === 'openSidePanel') {
    handleOpenSidePanel(sender)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Background side panel error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will respond asynchronously
    return true;
  }
  
  sendResponse({ success: true });
});

/**
 * 사이드패널 열기 처리
 */
async function handleOpenSidePanel(sender: chrome.runtime.MessageSender) {
  try {
    if (sender.tab?.id) {
      console.log('📱 Background: Opening side panel for tab', sender.tab.id);
      await chrome.sidePanel.open({ tabId: sender.tab.id });
      console.log('✅ Background: Side panel opened successfully');
    } else {
      throw new Error('No tab ID available');
    }
  } catch (error) {
    console.error('❌ Background: Failed to open side panel:', error);
    throw error;
  }
}

/**
 * 스크랩 요청 처리
 */
async function handleScrapRequest(scrapData: ScrapResult) {
  try {
    console.log('📝 Background: Processing scrap request');
    
    // 태그 정보 추출 (scrapHelper에서 추가된 경우)
    const tags = (scrapData as any).tags || [];
    
    const response = await scrapService.quickScrap(
      scrapData,
      '', // userComment
      tags // tags
    );
    
    console.log('✅ Background: Scrap completed successfully');
    return response;
  } catch (error) {
    console.error('❌ Background: Scrap failed:', error);
    throw error;
  }
}

export {}; 