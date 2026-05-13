import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastBridgeProvider } from '@/components/ToastBridgeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { clearClientCaches } from '@/lib/clearClientCaches';
import api from '@/api';
import { API_BASE } from '@/config/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalErrorModal } from '@/components/GlobalErrorModal';
import { installFetchErrorInterceptor, installGlobalErrorHandlers } from '@/lib/errorHandler';
import './styles.css';
/** Ensures Control Center styles load even if admin chunks reorder in production. */
import './styles/enterprise-admin.css';

void clearClientCaches();
api.session.bootstrapStorage();
installGlobalErrorHandlers();
installFetchErrorInterceptor();

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

if (DEBUG_API) {
  console.log('API BASE:', API_BASE);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastBridgeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <App />
            <GlobalErrorModal />
          </ErrorBoundary>
        </AuthProvider>
      </ToastBridgeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
