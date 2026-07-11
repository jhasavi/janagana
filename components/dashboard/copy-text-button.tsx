"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyTextButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted/60",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
