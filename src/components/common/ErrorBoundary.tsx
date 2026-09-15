import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * Top-level error boundary. Catches any unexpected render-time error so the app
 * never shows a fully blank/white screen. Session data in memory is lost when this
 * triggers, but anything already written to IndexedDB or exported to Excel is safe.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled application error:', error instanceof Error ? error.message : error);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-warm px-6">
        <div className="card-surface max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-subtle text-error">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
          <p className="text-sm text-ink-secondary mb-6">
            {this.state.message ?? 'An unexpected error occurred.'} Your saved progress in IndexedDB and any exported
            Excel files remain safe.
          </p>
          <button type="button" className="btn-primary mx-auto" onClick={this.handleReload}>
            <RefreshCcw size={16} aria-hidden="true" />
            Reload Learning Playground
          </button>
        </div>
      </div>
    );
  }
}
