import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('🚨 Error capturado por ErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card border border-rose-200 bg-white/90 p-8 shadow-xl text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-3xl font-display text-brand-brown mb-4">
              ¡Ups! Algo salió mal
            </h1>
            <p className="text-stone-600 mb-2">
              Ha ocurrido un error inesperado en la aplicación.
            </p>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-semibold text-brand-orange hover:text-brand-brown">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 p-4 bg-stone-50 rounded-xl text-xs text-stone-700 overflow-auto max-h-40 border border-stone-200">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-full bg-brand-orange px-6 py-3 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
              >
                Volver al inicio
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}