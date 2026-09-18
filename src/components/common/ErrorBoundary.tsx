import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  declare readonly props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
  }

  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep technical details strictly in internal console logs, never in user UI
    console.error('Store Engine caught an unhandled interface exception:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="error-boundary-view"
          className="min-h-screen flex items-center justify-center p-6 text-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
        >
          <div className="max-w-md w-full p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">
                Store Temporarily Unavailable
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                We encountered a brief interruption while updating this view. Please refresh your browser to reload the store.
              </p>
            </div>

            <button
              onClick={this.handleRefresh}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full text-sm font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 active:scale-98 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Store</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
