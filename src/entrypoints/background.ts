// Background Service Worker for Tyquill Extension
import { scrapService } from '../services/scrapService';
import { trackScrapCreatedBridge, captureInBackground } from '../analytics/bridge';
import { authService } from '../services/auth.service';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type {
  ExtensionMessage,
  MessageResponse,
  SidebarState,
  SidebarStateResponse
} from '../types/messages';

// WXT Analytics는 자동 초기화됨

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    // console.log('Tyquill Extension installed');
  });

  // Handle extension icon click to open side panel
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.error('No tab ID available');
      return;
    }

    try {
      // Open side panel for the current tab
      await browser.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Failed to open side panel:', error);
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

    if (request.action === 'performOAuth') {
      // Content script로부터의 OAuth 요청 처리
      authService.login().then(authResponse => {
        // console.log('✅ Background OAuth completed:', authResponse.user.email);
        sendResponse({ success: true, data: authResponse });
      }).catch(error => {
        console.error('❌ Background OAuth failed:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // async
    }

    if (request.action === 'logoutFromWebClient') {
      // 웹 클라이언트로부터의 로그아웃 요청 처리
      authService.logout().then(() => {
        // console.log('✅ Extension logged out from web client');
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
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Background side panel error:', error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we will respond asynchronously
      return true;
    }

    if (request.action === 'analytics:capture') {
      (async () => {
        try {
          // console.log('[analytics] capture (bg):', request.event, request.properties)
          await captureInBackground(request.event, request.properties)
          sendResponse({ success: true })
        } catch (error) {
          console.error('❌ Background analytics capture error:', error)
          sendResponse({ success: false, error: (error as Error)?.message })
        }
      })()
      return true;
    }

    if (request.action === 'openOptionsPage') {
      // Handle options page opening from content script context
      (async () => {
        try {
          if (browser.runtime.openOptionsPage) {
            await browser.runtime.openOptionsPage();
            sendResponse({ success: true });
          } else {
            console.error('browser.runtime.openOptionsPage is not available');
            sendResponse({ success: false, error: 'Options page not available' });
          }
        } catch (error) {
          console.error('❌ Failed to open options page:', error);
          sendResponse({ success: false, error: (error as Error)?.message });
        }
      })();
      return true;
    }

    if (request.action === 'openFullscreenEditor') {
      // Handle fullscreen editor opening from content script context
      (async () => {
        try {
          const { editorUrl } = request;
          if (!editorUrl) {
            sendResponse({ success: false, error: 'Editor URL is required' });
            return;
          }

          await browser.tabs.create({
            url: editorUrl,
            active: true
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error('❌ Failed to open fullscreen editor:', error);
          sendResponse({ success: false, error: (error as Error)?.message });
        }
      })();
      return true;
    }

    if (request.action === 'openViewer') {
      // Handle viewer opening from sidepanel context
      // console.log('🚀 Background: Received openViewer request:', request);
      (async () => {
        try {
          const { url, type, id } = request;
          // console.log('📝 Background: Extracted params - url:', url, 'type:', type, 'id:', id);

          if (!url) {
            console.error('❌ Background: Missing URL in openViewer request');
            sendResponse({ success: false, error: 'Viewer URL is required' });
            return;
          }

          // console.log(`🔧 Opening ${type} viewer for ID ${id}:`, url);

          // Check if browser.tabs.create is available
          if (!browser.tabs || !browser.tabs.create) {
            console.error('❌ Background: browser.tabs.create is not available');
            sendResponse({ success: false, error: 'Tabs API not available' });
            return;
          }

          const newTab = await browser.tabs.create({
            url: url,
            active: true
          });

          // console.log('✅ Background: Successfully created new tab:', newTab.id);
          sendResponse({ success: true, tabId: newTab.id });
        } catch (error) {
          console.error('❌ Background: Failed to open viewer:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          sendResponse({ success: false, error: errorMessage });
        }
      })();
      return true;
    }

    if (request.action === 'getActiveTabInfo') {
      handleGetActiveTabInfo()
        .then(response => {
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('❌ Background getActiveTabInfo error:', error);
          sendResponse({ success: false, error: error?.message || String(error) || 'Failed to get active tab info' });
        });
      return true;
    }

    if (request.action === 'exportToEditor') {
      handleExportToEditor(request)
        .then(response => {
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('❌ Background exportToEditor error:', error);
          sendResponse({ success: false, error: error?.message || String(error) || 'Export failed' });
        });
      return true;
    }

  });

  /**
   * Handle opening side panel
   */
  async function handleOpenSidePanel(sender: Browser.runtime.MessageSender) {
    try {
      if (!sender.tab?.id) {
        throw new Error('No tab ID available');
      }

      // Open side panel using Chrome Side Panel API
      await browser.sidePanel.open({ tabId: sender.tab.id });
    } catch (error) {
      console.error('❌ Background: Failed to open side panel:', error);
      throw error;
    }
  }

  /**
   * Handle export to editor platform
   */
  async function handleExportToEditor(request: any) {
    try {
      const { title, content, platform } = request;

      // Get active tab
      const tabInfo = await handleGetActiveTabInfo();

      // Check if content script is loaded, if not inject it
      try {
        await browser.tabs.sendMessage(tabInfo.id, { type: 'PING' });
      } catch (pingError) {
        // Content script not loaded, inject it
        console.log('Content script not loaded on active tab, injecting...');
        try {
          await browser.scripting.executeScript({
            target: { tabId: tabInfo.id },
            files: ['content-scripts/content.js']
          });

          // Wait briefly for content script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          throw new Error('Cannot inject content script into this page');
        }
      }

      // Send export command to content script
      const response = await browser.tabs.sendMessage(tabInfo.id, {
        type: 'EXPORT_TO_EDITOR',
        title,
        content,
        platform
      });

      return response;
    } catch (error) {
      console.error('❌ Background: Failed to export to editor:', error);
      throw error;
    }
  }

  /**
   * Get current active tab information (requested from content script)
   */
  async function handleGetActiveTabInfo() {
    try {
      // Try to get active tab in current window first
      let tabs = await browser.tabs.query({ active: true, currentWindow: true });
      let tab = tabs[0];

      // If no active tab found in current window (can happen in sidepanel context),
      // try to get the last focused window's active tab
      if (!tab || !tab.id) {
        // console.log('No active tab in current window, trying lastFocusedWindow...');
        tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs[0];
      }

      // If still no tab, try to get any active tab
      if (!tab || !tab.id) {
        // console.log('No active tab in lastFocusedWindow, trying any active tab...');
        tabs = await browser.tabs.query({ active: true });
        tab = tabs[0];
      }

      if (!tab || !tab.id) {
        throw new Error('Cannot find active tab');
      }

      // console.log('✅ Found active tab:', tab.id, tab.url, tab.title);

      return {
        id: tab.id,
        url: tab.url || '',
        title: tab.title || ''
      };
    } catch (error) {
      console.error('❌ Background: Failed to get active tab info:', error);
      throw new Error(`Failed to get active tab info: ${(error as any)?.message || String(error)}`);
    }
  }

  /**
   * Handle current page clipping and scraping (executed in Background Script)
   */
  async function handleClipAndScrapCurrentPage(sender: Browser.runtime.MessageSender) {
    // console.log('🔄 Background: Starting handleClipAndScrapCurrentPage');
    try {
      // Get current active tab info
      let tabId = sender.tab?.id;
      // console.log('📝 Background: Sender tab ID:', tabId);

      // Query active tab if sender.tab is not available (when requested from Sidepanel)
      if (!tabId) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
        // console.log('📝 Background: Queried active tab ID:', tabId);
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

      // Request clipping from Content Script with timeout and error handling
      // console.log('📤 Background: Sending CLIP_PAGE message to tab:', tabId);
      let response;
      try {
        response = await browser.tabs.sendMessage(tabId, {
          type: 'CLIP_PAGE',
          options: { includeMetadata: false }
        });
        // console.log('📨 Background: Received response from content script:', response);
      } catch (messageError) {
        // Handle cases where sendMessage fails (e.g., content script not loaded, tab closed)
        console.error('❌ Background: Failed to send message to content script:', messageError);
        throw new Error('Could not communicate with content script. The page may need to be refreshed.');
      }

      // Add proper null/undefined checks for the response
      if (!response) {
        console.error('❌ Background: Content script response is null/undefined');
        throw new Error('Content script did not respond to CLIP_PAGE message');
      }

      if (response.success !== true) {
        console.error('❌ Background: Content script reported failure:', response);
        throw new Error(response.error || response.message || 'Clipping failed');
      }

      // console.log('✅ Background: Content script clipping successful');

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

      // Request clipping from Content Script with timeout and error handling
      let response;
      try {
        response = await browser.tabs.sendMessage(tabId, {
          type: 'CLIP_PAGE',
          options: { includeMetadata: true }
        });
      } catch (messageError) {
        // Handle cases where sendMessage fails (e.g., content script not loaded, tab closed)
        console.error('Failed to send message to content script:', messageError);
        throw new Error('Could not communicate with content script. The page may need to be refreshed.');
      }

      // Add proper null/undefined checks for the response
      if (!response) {
        throw new Error('Content script did not respond to CLIP_PAGE message');
      }

      if (response.success !== true) {
        throw new Error(response.error || response.message || 'Clipping failed');
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
