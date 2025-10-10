import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanelApp from './SidePanelApp';
import '../../content/styles.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<SidePanelApp />);
}
