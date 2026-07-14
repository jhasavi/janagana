"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function LinkChip({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      {label && <p className="mb-1 text-xs font-semibold text-foreground/80">{label}</p>}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 py-1.5 pl-3 pr-1.5">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate font-mono text-xs text-primary hover:text-foreground"
          title={href}
        >
          {href}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy link"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="Open link"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
