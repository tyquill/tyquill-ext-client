import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../options/App';
import { useLanguageStore } from '../../stores/languageStore';

// WXT Analytics는 자동 초기화됨

// Initialize language store
useLanguageStore.getState().initializeLanguage();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
