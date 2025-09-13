import React from 'react';
import { createRoot } from 'react-dom/client';
import EditorApp from '../../src/components/editor/EditorApp';
import { posthogClient } from '../../src/analytics/posthog';

// Initialize analytics (no event tracking yet)
posthogClient.init();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<EditorApp />);
}
