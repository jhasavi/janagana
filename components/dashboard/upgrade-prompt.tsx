import Link from "next/link";
import { Sparkles } from "lucide-react";

export function UpgradePrompt({ message }: { message?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <p className="flex-1 font-medium text-foreground">
        {message ?? "This is a Pro feature."}
      </p>
      <Link
        href="/dashboard/settings#plan"
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
