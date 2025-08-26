// Background Service Worker for Tyquill Extension
import { scrapService } from '../src/services/scrapService';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';

export default defineBackground(() => {
  // 사이드패널 상태 (전역)
  let isSidePanelOpen = false;

  browser.runtime.onInstalled.addListener(() => {
    // console.log('Tyquill Extension installed');
  });

  // Handle extension icon click to open side panel
  browser.action.onClicked.addListener(async (tab) => {
    // console.log('Extension icon clicked');
    
    // Open side panel
    try {
      await browser.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
      // console.log('Side panel opened');
    } catch (error) {
      // console.error('Failed to open side panel:', error);
    }
  });

  browser.runtime.onMessage.addListener((request: any, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
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

    if (request.action === 'clipCurrentPageForStyle') {
      handleClipCurrentPageForStyle(sender)
        .then(response => {
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('❌ Background clip for style error:', error);
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
  async function handleOpenSidePanel(sender: Browser.runtime.MessageSender) {
    try {
      if (sender.tab?.id) {
        await browser.sidePanel.open({ tabId: sender.tab.id });
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
  async function handleClipAndScrapCurrentPage(sender: Browser.runtime.MessageSender) {
    try {
      // 현재 활성 탭 정보 가져오기
      let tabId = sender.tab?.id;
      
      // Sidepanel에서 요청하는 경우 sender.tab이 없으므로 활성 탭을 쿼리
      if (!tabId) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }
      
      if (!tabId) {
        throw new Error('No active tab found');
      }

      const tab = await browser.tabs.get(tabId);
      
      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('browser://') || 
          tab.url?.startsWith('browser-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('이 페이지에서는 스크랩할 수 없습니다. (browser://, extension:// 등 제한된 페이지)');
      }

      // Content Script가 로드되었는지 확인
      try {
        await browser.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (pingError) {
        // Content script 수동 주입 시도
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-scripts/content.js']
        });
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Content Script로 클리핑 요청
      const response = await browser.tabs.sendMessage(tabId, {
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
        browser.runtime.sendMessage({
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

  /**
   * 문체 관리를 위한 현재 페이지 클리핑 처리 (Background Script에서 실행)
   * - 스크랩 API를 호출하지 않고 클리핑만 수행
   */
  async function handleClipCurrentPageForStyle(sender: Browser.runtime.MessageSender) {
    try {
      // 현재 활성 탭 정보 가져오기
      let tabId = sender.tab?.id;
      
      // Sidepanel에서 요청하는 경우 sender.tab이 없으므로 활성 탭을 쿼리
      if (!tabId) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }
      
      if (!tabId) {
        throw new Error('No active tab found');
      }

      const tab = await browser.tabs.get(tabId);
      
      // URL 체크 - 제한된 페이지에서는 스크랩 불가
      if (tab.url?.startsWith('browser://') || 
          tab.url?.startsWith('browser-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('이 페이지에서는 스크랩할 수 없습니다. (browser://, extension:// 등 제한된 페이지)');
      }

      // Content Script가 로드되었는지 확인
      try {
        await browser.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (pingError) {
        // Content script 수동 주입 시도
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-scripts/content.js']
        });
        
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Content Script로 클리핑 요청
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'CLIP_PAGE',
        options: { includeMetadata: true }
      });

      if (!response.success) {
        throw new Error(response.error || 'Clipping failed');
      }

      // 클리핑 결과만 반환 (스크랩 API 호출하지 않음)
      return response.data;
      
    } catch (error) {
      console.error('❌ Background: Clip for style failed:', error);
      throw error;
    }
  }

  // 플로팅 버튼 표시 상태 관리
  let isFloatingButtonVisible = true;

  // 설정 로드
  const loadSettings = async () => {
    try {
      const result = await browser.storage.sync.get(['tyquillSettings']);
      if (result.tyquillSettings?.floatingButtonVisible !== undefined) {
        isFloatingButtonVisible = result.tyquillSettings.floatingButtonVisible;
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  // 설정 변경 감지
  browser.storage.onChanged.addListener((changes) => {
    if (changes.tyquillSettings?.newValue?.floatingButtonVisible !== undefined) {
      isFloatingButtonVisible = changes.tyquillSettings.newValue.floatingButtonVisible;
      
      // Context Menu 업데이트
      createContextMenus();
      
      // console.log('Background: 플로팅 버튼 설정 변경됨:', isFloatingButtonVisible);
    }
  });

  // Context Menu 생성
  const createContextMenus = () => {
    // 기존 메뉴 제거
    browser.contextMenus.removeAll();
    
    // Tyquill 메뉴 생성
    browser.contextMenus.create({
      id: 'tyquill',
      title: 'Tyquill',
      contexts: ['all']
    });
    
    // 플로팅 버튼 표시/숨김 서브메뉴
    browser.contextMenus.create({
      id: 'toggleFloatingButton',
      parentId: 'tyquill',
      title: isFloatingButtonVisible ? '👁️ 버튼 숨기기' : '👁️‍🗨️ 버튼 표시하기',
      contexts: ['all']
    });
    
    // 구분선
    browser.contextMenus.create({
      id: 'separator1',
      parentId: 'tyquill',
      type: 'separator',
      contexts: ['all']
    });
    
    // 스크랩 메뉴
    browser.contextMenus.create({
      id: 'scrapCurrentPage',
      parentId: 'tyquill',
      title: '📋 이 페이지 스크랩',
      contexts: ['all']
    });
  };

  // Context Menu 클릭 처리
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    
    switch (info.menuItemId) {
      case 'toggleFloatingButton':
        try {
          const newValue = !isFloatingButtonVisible;
          
          // 기존 설정을 유지하면서 업데이트
          const currentSettings = await browser.storage.sync.get(['tyquillSettings']);
          const updatedSettings = {
            ...currentSettings.tyquillSettings,
            floatingButtonVisible: newValue
          };
          
          await browser.storage.sync.set({
            tyquillSettings: updatedSettings
          });
          
          isFloatingButtonVisible = newValue;
          
          // 모든 탭에 설정 변경 알림
          const allTabs = await browser.tabs.query({});
          for (const currentTab of allTabs) {
            if (currentTab.id) {
              try {
                await browser.tabs.sendMessage(currentTab.id, {
                  type: 'SETTINGS_CHANGED',
                  settings: { floatingButtonVisible: newValue }
                });
              } catch (error) {
                // Content script가 로드되지 않은 탭은 무시
              }
            }
          }
          
          // Context Menu 업데이트
          createContextMenus();
          
          // console.log('플로팅 버튼 설정 변경됨:', newValue);
        } catch (error) {
          console.error('플로팅 버튼 설정 변경 실패:', error);
        }
        break;
        
      case 'scrapCurrentPage':
        try {
          await handleClipAndScrapCurrentPage({ tab });
        } catch (error) {
          console.error('스크랩 실패:', error);
        }
        break;
    }
  });

  browser.runtime.onInstalled.addListener(async () => {
    // 초기 설정 로드
    await loadSettings();
    
    // Context Menu 생성
    createContextMenus();
    
    // console.log('Tyquill Extension installed with context menus');
  });

  browser.runtime.setUninstallURL('https://tally.so/r/nGZK7z');
});
