import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Create shadow DOM container for better style isolation
const shadowHost = document.createElement('div');
shadowHost.id = 'tyquill-shadow-host';
shadowHost.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 2147483647;
  pointer-events: none;
`;

// Try to use shadow DOM for style isolation, fallback to regular DOM
let root: HTMLElement;
let shadowRoot: ShadowRoot | null = null;

try {
  // Create shadow root for better style isolation
  shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

  // Create the actual root element inside shadow DOM
  root = document.createElement('div');
  root.id = 'tyquill-content-root';
  root.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 2147483647;
  `;

  shadowRoot.appendChild(root);
  document.body.appendChild(shadowHost);
} catch (error) {
  // Fallback for browsers that don't support Shadow DOM
  console.warn('Shadow DOM not supported, using regular DOM');
  root = document.createElement('div');
  root.id = 'tyquill-content-root';
  root.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(root);
}

// Create React root and render the app
const reactRoot = createRoot(root);
reactRoot.render(<App />);