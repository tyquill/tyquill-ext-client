import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../sidepanel/App';

// WXT Analytics는 자동 초기화됨

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
