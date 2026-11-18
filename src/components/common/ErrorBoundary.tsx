import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassCard, Button } from '../ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="py-16 px-4 max-w-xl mx-auto">
          <GlassCard className="p-8 text-center space-y-5 border-coral/30 shadow-glass">
            <div className="w-14 h-14 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-light text-graphite tracking-tight">
                {this.props.fallbackTitle || 'Something went wrong on this page'}
              </h2>
              <p className="text-secondary text-sm mt-2 max-w-md mx-auto">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                icon={<RefreshCw size={15} />}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button variant="secondary" onClick={this.handleReset}>
                Try Again
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
