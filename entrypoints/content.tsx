import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/content/App';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const root = document.createElement('div');
    root.id = 'tyquill-content-root';
    document.body.appendChild(root);

    createRoot(root).render(<App />);
  },
});
