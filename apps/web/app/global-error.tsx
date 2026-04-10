'use client';

import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [correlationId, setCorrelationId] = React.useState<string>('');

  React.useEffect(() => {
    // Generate correlation ID for tracking
    const id = `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCorrelationId(id);

    // Capture error with context
    Sentry.withScope((scope) => {
      scope.setTag('correlation_id', id);
      scope.setTag('error_type', 'critical');
      scope.setContext('error_details', {
        message: error.message,
        name: error.name,
        digest: error.digest,
        stack: error.stack,
      });
      Sentry.captureException(error);
    });
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
          <Card className="max-w-md w-full shadow-lg border-destructive">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Critical Error</CardTitle>
              <CardDescription>
                A critical error occurred. The application cannot continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  <span className="font-semibold">Correlation ID:</span> {correlationId}
                </AlertDescription>
              </Alert>
              
              {error.digest && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs font-mono">
                    <span className="font-semibold">Error Digest:</span> {error.digest}
                  </AlertDescription>
                </Alert>
              )}
              
              {process.env.NODE_ENV === 'development' && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs font-mono break-all">
                    {error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full" variant="destructive">
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
      </body>
    </html>
  );
}
