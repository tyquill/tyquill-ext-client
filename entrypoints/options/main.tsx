import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/options/App';
import { posthogClient } from '../../src/analytics/posthog';
import { useLanguageStore } from '../../src/stores/languageStore';

// Initialize analytics (no event tracking yet)
posthogClient.init();

// Initialize language store
useLanguageStore.getState().initializeLanguage();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
