import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewerShell from '../../src/webviewer/App';
import { posthogClient } from '../../src/analytics/posthog';

// Initialize analytics (no event tracking yet)
posthogClient.init();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ViewerShell />);
}
