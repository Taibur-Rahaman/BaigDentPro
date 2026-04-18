import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastBridgeProvider } from '@/components/ToastBridgeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { getApiBaseUrl } from '@/config/api';
import './styles.css';

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

const viteApiUrlRaw = String(import.meta.env.VITE_API_URL || '').trim();
const isProductionModeBundle = import.meta.env.PROD && import.meta.env.MODE === 'production';

if (isProductionModeBundle && !viteApiUrlRaw) {
  console.error(
    'CRITICAL: VITE_API_URL is missing at build time. API calls will use same-origin /api and typically receive SPA HTML instead of JSON. Rebuild with VITE_API_URL=https://your-api-host (e.g. https://api.baigdentpro.com).'
  );
}

if (DEBUG_API) {
  try {
    console.log('API BASE:', getApiBaseUrl() || '(same-origin /api)');
  } catch (e) {
    console.warn('API BASE:', e instanceof Error ? e.message : e);
  }
}

function ProductionMissingApiUrlBanner() {
  if (!isProductionModeBundle || viteApiUrlRaw) return null;
  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        padding: '12px 16px',
        background: '#7f1d1d',
        color: '#fef2f2',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <strong>Configuration error:</strong> VITE_API_URL was missing when this app was built. Requests
      go to <code style={{ color: '#fecaca' }}>/api</code> on this host and return HTML. Rebuild the
      frontend with <code style={{ color: '#fecaca' }}>VITE_API_URL</code> set to your API origin (for
      example <code style={{ color: '#fecaca' }}>https://api.baigdentpro.com</code>).
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ProductionMissingApiUrlBanner />
    <BrowserRouter>
      <ToastBridgeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastBridgeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
