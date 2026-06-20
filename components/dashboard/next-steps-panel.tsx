import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

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
      label: "Confirm you are on the correct tenant (card above)",
    },
    {
      done: hasContacts,
      label: "Import your member list or verify a portal lead in Contacts",
      href: "/dashboard/members#import-spreadsheet",
    },
    {
      done: hasPublishedEvents,
      label: "Publish at least one event on the public portal",
      href: "/dashboard/events",
    },
    {
      done: hasRegistrations,
      label: "Confirm an event registration appears in Events",
      href: "/dashboard/events",
    },
    {
      done: false,
      label: `Point ${tenantSlug} website CTAs to your live portal URL`,
      externalHref: portalUrl,
    },
  ];

  const next = steps.find((s) => !s.done);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">What to do next</h2>
      {next ? (
        <p className="mt-2 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-950">Next: </span>
          {next.externalHref ? (
            <a href={next.externalHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-900 hover:text-slate-950">
              {next.label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : next.href ? (
            <Link href={next.href} className="font-semibold text-teal-900 hover:text-slate-950">
              {next.label}
            </Link>
          ) : (
            next.label
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-emerald-800">Pilot loop looks healthy. Keep monitoring recent contacts and registrations below.</p>
      )}
      <ol className="mt-4 space-y-2 text-sm text-slate-600">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            )}
            <span className={step.done ? "text-slate-500 line-through" : "text-slate-800"}>
              {step.externalHref && !step.done ? (
                <a href={step.externalHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-900 hover:text-slate-950">
                  {step.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : step.href && !step.done ? (
                <Link href={step.href} className="font-semibold text-teal-900 hover:text-slate-950">
                  {step.label}
                </Link>
              ) : (
                step.label
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
