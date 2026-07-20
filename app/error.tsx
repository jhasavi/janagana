"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ROOT_SEGMENT_CLIENT_ERROR", {
      message: error.message.slice(0, 200),
      digest: error.digest ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-bold text-foreground">Something went wrong</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This page hit an unexpected error. It&apos;s been logged — try again or return home.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">Ref: {error.digest}</p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground hover:bg-accent/90"
          >
            Retry
          </button>
          <Link
            href="/"
            className="flex h-9 items-center rounded-lg bg-primary/10 px-4 text-sm font-bold text-primary hover:bg-primary/15"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
