"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
