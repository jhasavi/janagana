"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? "Copied" : "Copy email"}
    </Button>
  );
}
