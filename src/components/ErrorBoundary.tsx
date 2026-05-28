import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-950/20 border border-red-500/20 rounded-3xl text-red-400 font-mono text-xs max-w-2xl mx-auto mt-12 flex flex-col gap-4">
          <h2 className="text-base font-bold text-red-500">Системд алдаа гарлаа (App Error)</h2>
          <pre className="whitespace-pre-wrap overflow-auto max-h-[300px] bg-black/40 p-4 rounded-xl border border-white/5">
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl self-start cursor-pointer transition-colors"
          >
            Дахин ачааллах (Reload)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
