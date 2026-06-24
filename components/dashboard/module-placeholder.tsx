import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  comingSoonLabel = "Coming soon",
  bullets,
  relatedHref,
  relatedLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  comingSoonLabel?: string;
  bullets?: string[];
  relatedHref?: string;
  relatedLabel?: string;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-900 ring-1 ring-teal-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Community OS</p>
            <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">{description}</p>
      </header>

      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 shadow-sm">
        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          {comingSoonLabel}
        </span>
        <p className="mt-3 text-sm font-medium text-slate-950">This module is on the roadmap.</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
        {relatedHref && relatedLabel && (
          <Link href={relatedHref} className="mt-4 inline-block text-sm font-semibold text-teal-900 hover:text-slate-950">
            {relatedLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
