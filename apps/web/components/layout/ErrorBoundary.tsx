'use client';

import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (typeof window !== 'undefined') {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
          digest: errorInfo.digest,
        },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
