import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../content/App';
import '../content/styles.css'; // Import CSS for shadow DOM
import { browser } from 'wxt/browser';
import { performExport } from '../utils/exportHelper';
import { ExportPlatform } from '../utils/platformDetection';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // Enable UI mode for shadow DOM support

  async main(ctx) {
    // WXT Analytics는 자동 초기화됨

    // Register message listener for export functionality (independent of UI)
    browser.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
      // PING check
      if (request.type === 'PING') {
        sendResponse({ success: true, data: { loaded: true } });
        return true;
      }

      // Export to editor handler
      if (request.type === 'EXPORT_TO_EDITOR') {
        (async () => {
          try {
            const { title, content, platform } = request;
            const result = await performExport(platform as ExportPlatform, title, content);
            sendResponse(result);
          } catch (error) {
            console.error('📄 Content script: Export failed:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })();
        return true; // Keep channel open for async response
      }

      return false;
    });

    // Create shadow root UI for the main app (FloatingButton)
    const mainUI = await createShadowRootUi(ctx, {
      name: 'tyquill-main-ui',
      position: 'overlay',
      onMount: (container) => {
        // Create React root and render the main app inside shadow DOM
        const reactRoot = createRoot(container);
        reactRoot.render(<App />);
      },
    });

    // Mount UI
    mainUI.mount();
  },
});
