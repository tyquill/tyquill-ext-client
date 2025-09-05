import React from 'react';
import { createRoot } from 'react-dom/client';
import EditorApp from '../../src/components/editor/EditorApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<EditorApp />);
}
