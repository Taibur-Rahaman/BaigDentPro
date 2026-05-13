import React from 'react';
import { captureError } from '@/lib/errorHandler';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    captureError(error, { code: 'REACT_ERROR_BOUNDARY' });
  }

  private handleRecover = (): void => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc' }}>
        <div style={{ maxWidth: 520, width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 20 }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Something went wrong</h2>
          <p style={{ color: '#475569', marginTop: 8 }}>
            The app hit an unexpected issue, but your session is still recoverable.
          </p>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="neo-btn neo-btn-primary" onClick={this.handleRecover}>
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
