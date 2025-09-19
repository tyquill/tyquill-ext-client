import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../content/App';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // WXT Analytics는 자동 초기화됨

    const root = document.createElement('div');
    root.id = 'tyquill-content-root';
    document.body.appendChild(root);

    createRoot(root).render(<App />);
  },
});
