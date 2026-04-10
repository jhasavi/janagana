'use client';

import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const [correlationId, setCorrelationId] = React.useState<string>('');

  React.useEffect(() => {
    // Generate correlation ID for tracking
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCorrelationId(id);

    // Capture error with context
    Sentry.withScope((scope) => {
      scope.setTag('correlation_id', id);
      scope.setContext('error_details', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      Sentry.captureException(error);
    });
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="default" className="bg-muted">
            <AlertDescription className="text-xs">
              <span className="font-semibold">Correlation ID:</span> {correlationId}
            </AlertDescription>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs font-mono">
                {error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
