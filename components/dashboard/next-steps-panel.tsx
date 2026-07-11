import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export function NextStepsPanel({
  tenantSlug,
  portalUrl,
  hasContacts,
  hasPublishedEvents,
  hasRegistrations,
}: {
  tenantSlug: string;
  portalUrl: string;
  hasContacts: boolean;
  hasPublishedEvents: boolean;
  hasRegistrations: boolean;
}) {
  const steps: { done: boolean; label: string; href?: string; externalHref?: string }[] = [
    {
      done: true,
      label: "Confirm you're managing the right community",
    },
    {
      done: hasContacts,
      label: "Import your member list or verify a portal lead",
      href: "/dashboard/members/import",
    },
    {
      done: hasPublishedEvents,
      label: "Publish at least one event on the member portal",
      href: "/dashboard/events",
    },
    {
      done: hasRegistrations,
      label: "Confirm an event registration appears in Events",
      href: "/dashboard/events",
    },
    {
      done: false,
      label: `Add portal links to the ${tenantSlug} website`,
      externalHref: portalUrl,
    },
  ];

  const next = steps.find((s) => !s.done);
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Getting started</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{steps.length} done
          </span>
        </div>
        {next ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">Next step: </span>
            {next.externalHref ? (
              <a
                href={next.externalHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:text-foreground"
              >
                {next.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : next.href ? (
              <Link href={next.href} className="font-semibold text-primary hover:text-foreground">
                {next.label}
              </Link>
            ) : (
              next.label
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-800">Setup complete. Keep monitoring recent activity below.</p>
        )}
        <ol className="mt-4 space-y-2.5 text-sm">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2.5">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-border" aria-hidden />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : "text-foreground/90"}>
                {step.externalHref && !step.done ? (
                  <a
                    href={step.externalHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:text-foreground"
                  >
                    {step.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : step.href && !step.done ? (
                  <Link href={step.href} className="font-semibold text-primary hover:text-foreground">
                    {step.label}
                  </Link>
                ) : (
                  step.label
                )}
              </span>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
