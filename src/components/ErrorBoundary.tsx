import React from 'react';
import { captureError } from '@/lib/errorHandler';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

function isLikelyStaleChunkError(err: Error | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const name = (err as { name?: string }).name || '';
  return (
    name === 'ChunkLoadError' ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const err = error instanceof Error ? error : new Error(String(error));
    return { hasError: true, error: err };
  }

  override componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    captureError(error, { code: 'REACT_ERROR_BOUNDARY' });
    // Always log — helps diagnose production hangs when DevTools is opened after the crash.
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[ErrorBoundary]', msg, error, errorInfo.componentStack);
  }

  private handleRecover = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoPracticeHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard/overview');
    }
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const err = this.state.error;
    const showDevDetails =
      typeof import.meta !== 'undefined' && import.meta.env?.DEV === true && err != null;

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc' }}>
        <div style={{ maxWidth: 520, width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 20 }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Something went wrong</h2>
          <p style={{ color: '#475569', marginTop: 8 }}>
            The app hit an unexpected issue, but your session is still recoverable.
          </p>
          {err && isLikelyStaleChunkError(err) ? (
            <p style={{ color: '#64748b', marginTop: 8, fontSize: '0.9rem' }}>
              This often happens after a new release when the browser still has an old JavaScript bundle cached.
              Use &quot;Reload app&quot; (or a hard refresh) to fetch the latest assets — your login session is
              unchanged.
            </p>
          ) : null}
          {showDevDetails && err ? (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 240,
                color: '#0f172a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {err.message}
              {'\n\n'}
              {err.stack ?? ''}
            </pre>
          ) : null}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={this.handleRecover}>
              Try again
            </button>
            <button type="button" className="neo-btn neo-btn-primary" onClick={this.handleGoPracticeHome}>
              Go to practice home
            </button>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={() => window.location.reload()}>
              Full reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
