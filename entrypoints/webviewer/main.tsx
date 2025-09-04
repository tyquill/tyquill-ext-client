import React from 'react';
import { createRoot } from 'react-dom/client';
import ViewerShell from '../../src/webviewer/App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ViewerShell />);
}
