import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.createElement('div');
root.id = 'tyquill-content-root';
document.body.appendChild(root);

createRoot(root).render(<App />);