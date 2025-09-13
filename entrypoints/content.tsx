import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/content/App';
import { posthogClient } from '../src/analytics/posthog';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Initialize analytics (no event tracking yet)
    posthogClient.init();

    const root = document.createElement('div');
    root.id = 'tyquill-content-root';
    document.body.appendChild(root);

    createRoot(root).render(<App />);
  },
});
