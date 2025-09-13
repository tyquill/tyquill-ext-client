import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/sidepanel/App';
import { posthogClient } from '../../src/analytics/posthog';

// Initialize analytics (no event tracking yet)
posthogClient.init();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
