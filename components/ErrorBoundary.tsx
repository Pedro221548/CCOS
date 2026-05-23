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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0f111a] text-slate-900 dark:text-slate-200">
          <div className="bg-white dark:bg-[#1c1e26] p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800/50">
            <h1 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-3 uppercase tracking-widest">
              Erro na Aplicação
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 bg-slate-100 dark:bg-slate-900 p-4 rounded-xl font-mono overflow-auto max-h-48 break-words leading-relaxed border border-red-500/10">
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
            <button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs"
              onClick={() => window.location.reload()}
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
