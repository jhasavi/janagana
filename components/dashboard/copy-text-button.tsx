"use client";

import { useState } from "react";

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
      className={`rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-stone-50 ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
