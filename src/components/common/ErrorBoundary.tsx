import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('AccessDenied Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-neo-surface border-2 border-neo-ink rounded-neo text-center m-4 shadow-neo-lg">
          <div className="w-12 h-12 rounded-neo bg-neo-coral border-2 border-neo-ink flex items-center justify-center mb-4 text-neo-on-accent neo-on-accent">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="neo-heading text-base text-neo-ink mb-2">
            Canvas Render Interrupted
          </h3>
          <p className="text-xs text-neo-muted max-w-md mb-4 font-mono break-all">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="neo-btn neo-btn-primary flex items-center gap-2 px-4 py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
