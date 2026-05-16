import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (root == null) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <div className="h-full p-4 md:p-6 box-border">
      <App />
    </div>
  </React.StrictMode>,
);
