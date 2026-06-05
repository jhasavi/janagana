import Link from "next/link";

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
      label: "Verify a website lead or portal form submission appears in Contacts",
      href: "/dashboard/members",
    },
    {
      done: hasPublishedEvents,
      label: "Publish at least one event on the public portal",
      href: "/dashboard/events",
    },
    {
      done: hasRegistrations,
      label: "Confirm an event registration shows under Events → Registrations",
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
    <section className="rounded-md border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">What to do next</h2>
      {next ? (
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Next: </span>
          {next.externalHref ? (
            <a href={next.externalHref} target="_blank" rel="noreferrer" className="text-blue-700 underline">
              {next.label}
            </a>
          ) : next.href ? (
            <Link href={next.href} className="text-blue-700 underline">
              {next.label}
            </Link>
          ) : (
            next.label
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-emerald-800">Pilot loop looks healthy — keep monitoring recent contacts and registrations below.</p>
      )}
      <ol className="mt-4 space-y-2 text-sm text-gray-600">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2">
            <span className={step.done ? "text-emerald-600" : "text-gray-400"} aria-hidden>
              {step.done ? "✓" : "○"}
            </span>
            <span className={step.done ? "text-gray-500 line-through" : "text-gray-800"}>
              {step.externalHref && !step.done ? (
                <a href={step.externalHref} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  {step.label}
                </a>
              ) : step.href && !step.done ? (
                <Link href={step.href} className="text-blue-700 underline">
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
