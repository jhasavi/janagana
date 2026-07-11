import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </div>
        <PageHeader eyebrow="Command center" title={title} description={description} />
      </div>

      <Card>
        <CardBody>
          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            {comingSoonLabel}
          </span>
          <p className="mt-3 text-sm font-medium text-foreground">This module is on the roadmap.</p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {relatedHref && relatedLabel && (
            <Link href={relatedHref} className="mt-4 inline-block text-sm font-semibold text-primary hover:text-foreground">
              {relatedLabel} →
            </Link>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
