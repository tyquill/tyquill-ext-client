import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../content/App';
import SidebarApp from '../content/SidebarApp';
import '../content/styles.css'; // Import CSS for shadow DOM

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // Enable UI mode for shadow DOM support

  async main(ctx) {
    // WXT Analytics는 자동 초기화됨

    // Create separate shadow root UI for the main app (FloatingButton)
    const mainUI = await createShadowRootUi(ctx, {
      name: 'tyquill-main-ui',
      position: 'overlay',
      onMount: (container) => {
        // Create React root and render the main app inside shadow DOM
        const reactRoot = createRoot(container);
        reactRoot.render(<App />);
      },
    });

    // Create separate shadow root UI for the sidebar
    const sidebarUI = await createShadowRootUi(ctx, {
      name: 'tyquill-sidebar-ui',
      position: 'overlay',
      onMount: (container) => {
        // Create React root and render the sidebar app inside shadow DOM
        const reactRoot = createRoot(container);
        reactRoot.render(<SidebarApp />);
      },
    });

    // Mount both UIs
    mainUI.mount();
    sidebarUI.mount();
  },
});
