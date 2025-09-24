// Background Service Worker for Tyquill Extension
import { scrapService } from '../services/scrapService';
import { trackScrapCreatedBridge, captureInBackground } from '../analytics/bridge';
import { authService } from '../services/auth.service';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';

// WXT Analytics는 자동 초기화됨

export default defineBackground(() => {
  // Side panel state (global)
  let isSidePanelOpen = false;

  browser.runtime.onInstalled.addListener(() => {
    // console.log('Tyquill Extension installed');
  });

  // Handle extension icon click to open sidebar via content script
  browser.action.onClicked.addListener(async (tab) => {
    // console.log('Extension icon clicked');

    if (!tab.id) {
      console.error('No tab ID available');
      return;
    }

    try {
      // Check if content script is loaded first
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch (pingError) {
        // Content script not loaded, inject it
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });

        // Wait briefly for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send message to content script to open sidebar
      await browser.tabs.sendMessage(tab.id, {
        action: 'openSidebar'
      });

      // console.log('Sidebar opened via content script');
    } catch (error) {
      console.error('Failed to open sidebar:', error);
    }
  });

  browser.runtime.onMessage.addListener((request: any, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    // Handle messages from content script or popup
    // console.log('Message received:', request);
    

    if (request.action === 'getAuthState') {
      // 인증 상태 요청 처리
      authService.restoreAuthState().then(async () => {
        const authState = authService.getAuthState();
        sendResponse({ success: true, authState });
      }).catch(error => {
        console.error('❌ Failed to get auth state:', error);
        sendResponse({ success: false, authState: null });
      });
      return true; // async
    }

    if (request.action === 'logoutFromWebClient') {
      // 웹 클라이언트로부터의 로그아웃 요청 처리
      authService.logout().then(() => {
        console.log('✅ Extension logged out from web client');
        // 사이드패널은 자동으로 랜딩페이지로 전환됨 (isAuthenticated가 false로 변경되므로)
        sendResponse({ success: true });
      }).catch(error => {
        console.error('❌ Failed to logout extension:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // async
    }

    if (request.action === 'scrapExtracted') {
      handleScrapExtracted(request.data)
        .then(response => {
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('❌ Background scrapExtracted error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // async
    }

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
      // Send close message to side panel
      isSidePanelOpen = false;
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'getSidePanelState') {
      sendResponse({ success: true, isOpen: isSidePanelOpen });
      return true;
    }

    if (request.action === 'sidePanelClosed') {
      // Notify that side panel has been closed
      isSidePanelOpen = false;
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'analytics:capture') {
      (async () => {
        try {
          console.log('[analytics] capture (bg):', request.event, request.properties)
          await captureInBackground(request.event, request.properties)
          sendResponse({ success: true })
        } catch (error) {
          console.error('❌ Background analytics capture error:', error)
          sendResponse({ success: false, error: (error as Error)?.message })
        }
      })()
      return true;
    }

  });

  /**
   * Handle opening sidebar via content script
   */
  async function handleOpenSidePanel(sender: Browser.runtime.MessageSender) {
    try {
      if (!sender.tab?.id) {
        throw new Error('No tab ID available');
      }

      // Check if content script is loaded first
      try {
        await browser.tabs.sendMessage(sender.tab.id, { type: 'PING' });
      } catch (pingError) {
        // Content script not loaded, inject it
        await browser.scripting.executeScript({
          target: { tabId: sender.tab.id },
          files: ['content-scripts/content.js']
        });

        // Wait briefly for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send message to content script to open sidebar
      await browser.tabs.sendMessage(sender.tab.id, {
        action: 'openSidebar'
      });
    } catch (error) {
      console.error('❌ Background: Failed to open sidebar:', error);
      throw error;
    }
  }


  /**
   * Handle current page clipping and scraping (executed in Background Script)
   */
  async function handleClipAndScrapCurrentPage(sender: Browser.runtime.MessageSender) {
    try {
      // Get current active tab info
      let tabId = sender.tab?.id;

      // Query active tab if sender.tab is not available (when requested from Sidepanel)
      if (!tabId) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }
      
      if (!tabId) {
        throw new Error('No active tab found');
      }

      const tab = await browser.tabs.get(tabId);
      
      // URL check - restricted pages cannot be scraped
      if (tab.url?.startsWith('browser://') ||
          tab.url?.startsWith('browser-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('Cannot scrap this page (restricted pages like browser://, extension://, etc.)');
      }

      // Check if Content Script is loaded
      try {
        await browser.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (pingError) {
        // Try manual content script injection
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-scripts/content.js']
        });

        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Request clipping from Content Script
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'CLIP_PAGE',
        options: { includeMetadata: false }
      });

      if (!response.success) {
        throw new Error(response.error || 'Clipping failed');
      }

      // Create scrap data
      const scrapResult = {
        ...response.data,
      };

      // Create scrap
      const tags = (scrapResult as any).tags || [];
      const result = await scrapService.quickScrap(
        scrapResult,
        '', // userComment
        tags // tags
      );
      // Track scrap created directly from background to ensure delivery
      try {
        await trackScrapCreatedBridge({ source: 'background' })
      } catch (e) {
        console.warn('Analytics scrap_created failed (bg):', e)
      }
      
      // Notify sidepanel to refresh on success
      try {
        await browser.runtime.sendMessage({
          action: 'scrapCreated',
          data: result
        }).catch(() => {
          // Ignore error as sidepanel might not be open
          if (browser.runtime.lastError) {
            void browser.runtime.lastError;
          }
        });
      } catch (error) {
        // Ignore error as sidepanel might not be open
        if (browser.runtime.lastError) {
          void browser.runtime.lastError;
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Background: Clip and scrap failed:', error);
      throw error;
    }
  }

  /**
   * Handle current page clipping for style management (executed in Background Script)
   * - Only perform clipping without calling scrap API
   */
  async function handleClipCurrentPageForStyle(sender: Browser.runtime.MessageSender) {
    try {
      // Get current active tab info
      let tabId = sender.tab?.id;

      // Query active tab if sender.tab is not available (when requested from Sidepanel)
      if (!tabId) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }
      
      if (!tabId) {
        throw new Error('No active tab found');
      }

      const tab = await browser.tabs.get(tabId);
      
      // URL check - restricted pages cannot be scraped
      if (tab.url?.startsWith('browser://') ||
          tab.url?.startsWith('browser-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('Cannot scrap this page (restricted pages like browser://, extension://, etc.)');
      }

      // Check if Content Script is loaded
      try {
        await browser.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (pingError) {
        // Try manual content script injection
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-scripts/content.js']
        });

        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Request clipping from Content Script
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'CLIP_PAGE',
        options: { includeMetadata: true }
      });

      if (!response.success) {
        throw new Error(response.error || 'Clipping failed');
      }

      // Return only clipping result (without calling scrap API)
      return response.data;
      
    } catch (error) {
      console.error('❌ Background: Clip for style failed:', error);
      throw error;
    }
  }

  /**
   * Save container text sent by LinkedIn button to API
   */
  async function handleScrapExtracted(data: { content: string; title?: string; url?: string }) {
    if (!data?.content || !data.content.trim()) {
      throw new Error('Empty content');
    }

    const pickTitle = () => (data.title && data.title.trim()) || 'LinkedIn Feed';

    const scrapResult = {
      content: data.content,
      metadata: {
        title: pickTitle(),
        url: data.url || '',
      },
      selectionOnly: false,
      timestamp: new Date().toISOString(),
    } as any;

    const tags: string[] = [];
    const result = await scrapService.quickScrap(scrapResult, '', tags);

    try {
      await browser.runtime.sendMessage({ action: 'scrapCreated', data: result }).catch(() => {
        if (browser.runtime.lastError) {
          void browser.runtime.lastError;
        }
      });
    } catch {
      if (browser.runtime.lastError) {
        void browser.runtime.lastError;
      }
    }

    return result;
  }

  // Floating button visibility state management
  let isFloatingButtonVisible = true;

  // Load settings
  const loadSettings = async () => {
    try {
      const result = await browser.storage.sync.get(['tyquillSettings']);
      if (result.tyquillSettings?.floatingButtonVisible !== undefined) {
        isFloatingButtonVisible = result.tyquillSettings.floatingButtonVisible;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Detect settings changes
  browser.storage.onChanged.addListener((changes) => {
    if (changes.tyquillSettings?.newValue?.floatingButtonVisible !== undefined) {
      isFloatingButtonVisible = changes.tyquillSettings.newValue.floatingButtonVisible;

      // Update Context Menu
      createContextMenus();

      // console.log('Background: Floating button setting changed:', isFloatingButtonVisible);
    }
  });

  // Create Context Menu
  const createContextMenus = () => {
    // Remove existing menus
    browser.contextMenus.removeAll();

    // Create Tyquill menu
    browser.contextMenus.create({
      id: 'tyquill',
      title: 'Tyquill',
      contexts: ['all']
    });

    // Floating button show/hide submenu
    browser.contextMenus.create({
      id: 'toggleFloatingButton',
      parentId: 'tyquill',
      title: isFloatingButtonVisible ? 'Hide Button' : 'Show Button',
      contexts: ['all']
    });

    // Separator
    browser.contextMenus.create({
      id: 'separator1',
      parentId: 'tyquill',
      type: 'separator',
      contexts: ['all']
    });

    // Scrap menu
    browser.contextMenus.create({
      id: 'scrapCurrentPage',
      parentId: 'tyquill',
      title: 'Scrap This Page',
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
          
          // Update while preserving existing settings
          const currentSettings = await browser.storage.sync.get(['tyquillSettings']);
          const updatedSettings = {
            ...currentSettings.tyquillSettings,
            floatingButtonVisible: newValue
          };

          await browser.storage.sync.set({
            tyquillSettings: updatedSettings
          });

          isFloatingButtonVisible = newValue;

          // Notify all tabs of settings change
          const allTabs = await browser.tabs.query({});
          for (const currentTab of allTabs) {
            if (currentTab.id) {
              try {
                await browser.tabs.sendMessage(currentTab.id, {
                  type: 'SETTINGS_CHANGED',
                  settings: { floatingButtonVisible: newValue }
                });
              } catch (error) {
                // Ignore tabs without content script loaded or in back/forward cache
                if (browser.runtime.lastError) {
                  void browser.runtime.lastError;
                }
              }
            }
          }

          // Update Context Menu
          createContextMenus();

          // console.log('Floating button setting changed:', newValue);
        } catch (error) {
          console.error('Failed to change floating button setting:', error);
        }
        break;
        
      case 'scrapCurrentPage':
        try {
          await handleClipAndScrapCurrentPage({ tab });
        } catch (error) {
          console.error('Scrap failed:', error);
        }
        break;
    }
  });

  browser.runtime.onInstalled.addListener(async () => {
    // Load initial settings
    await loadSettings();

    // Create Context Menu
    createContextMenus();
    
    // console.log('Tyquill Extension installed with context menus');
  });

  browser.runtime.setUninstallURL('https://tally.so/r/nGZK7z');
});
