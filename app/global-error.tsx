"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ROOT_LAYOUT_CLIENT_ERROR", {
      message: error.message.slice(0, 200),
      digest: error.digest ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: "420px", textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: "14px" }}>Something went wrong</p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>
              The app hit an unexpected error loading its base layout. It&apos;s been logged — try again.
            </p>
            {error.digest && (
              <p style={{ marginTop: "8px", fontFamily: "monospace", fontSize: "12px", color: "#9ca3af" }}>
                Ref: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "16px",
                height: "36px",
                borderRadius: "8px",
                background: "#111827",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                padding: "0 16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
