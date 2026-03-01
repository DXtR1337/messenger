'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      const { error, showDetails } = this.state;
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-400">
            {this.props.section ? `Błąd w sekcji: ${this.props.section}` : 'Coś poszło nie tak'}
          </p>
          {error && (
            <button
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 underline"
            >
              {showDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
            </button>
          )}
          {showDetails && error && (
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-left text-[10px] text-red-300/70 font-mono">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, showDetails: false })}
            className="mt-3 text-xs text-zinc-400 hover:text-white underline"
          >
            Spróbuj ponownie
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
