import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewerShell from '../../webviewer/App';

// WXT Analytics는 자동 초기화됨

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ViewerShell />);
}
