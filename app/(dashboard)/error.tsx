'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset?: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold">Dashboard failed to load</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Something went wrong while rendering the dashboard. Refresh the page or return to the main app.
          </p>
          {error?.message ? (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground break-words">
              {error.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => (reset ? reset() : window.location.reload())}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
