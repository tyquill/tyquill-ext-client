import React from 'react';
import { createRoot } from 'react-dom/client';
import EditorApp from '../../components/editor/EditorApp';

// WXT Analytics는 자동 초기화됨

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<EditorApp />);
}
