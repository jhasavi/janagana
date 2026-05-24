'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class AnalyticsWidgetBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AnalyticsWidgetBoundary] chart render error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground" data-testid="analytics-widget-error-fallback">
          Unable to load this section.
        </div>
      )
    }

    return this.props.children
  }
}
