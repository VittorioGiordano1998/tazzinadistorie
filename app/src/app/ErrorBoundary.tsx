import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from '../ui/components'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Full-page centering for the root boundary; inline for the shell one. */
  fullPage?: boolean
}

interface ErrorBoundaryState {
  error: Error | null
}

/** A crashed view shows a friendly fallback instead of a white screen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No logging wrapper in this project: the boundary is the last line of sight.
    console.error('Una tazzina di storie: errore di rendering', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div
        className={
          this.props.fullPage
            ? 'flex min-h-dvh items-center justify-center p-6'
            : 'flex items-center justify-center px-4 py-10'
        }
      >
        <div className="w-full max-w-md space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
          <p className="font-display text-lg font-semibold text-ink">Qualcosa è andato storto</p>
          <p className="text-sm text-ink-muted">
            Le storie salvate sono al sicuro. Ricarica la pagina per ripartire.
          </p>
          <Button size="sm" onClick={() => window.location.reload()}>
            Ricarica
          </Button>
        </div>
      </div>
    )
  }
}
