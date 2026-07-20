"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DASHBOARD_SEGMENT_CLIENT_ERROR", {
      message: error.message.slice(0, 200),
      digest: error.digest ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md border-destructive/30 bg-destructive/[0.03]">
        <CardBody className="text-center">
          <p className="text-sm font-bold text-foreground">Something went wrong</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This page hit an unexpected error. It&apos;s been logged — try again or head back to the dashboard.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-muted-foreground/70">Ref: {error.digest}</p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="accent" size="sm" onClick={reset}>
              Retry
            </Button>
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              Back to dashboard
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
