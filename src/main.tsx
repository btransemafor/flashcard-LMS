import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppProvider } from '@/store/AppContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Note: the service worker itself is generated and auto-registered by vite-plugin-pwa
// (see vite.config.ts, registerType: 'autoUpdate'). No manual registration is needed here.
