import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export type SetupStep = { id: string; label: string; detail: string; href: string; done: boolean };

export function buildSetupSteps(input: {
  hasLogo: boolean;
  stripeConnected: boolean;
  contactsTotal: number;
  tierCount: number;
  publishedEvents: number;
}): SetupStep[] {
  return [
    { id: "logo", label: "Add your logo", detail: "Shown on your portal, receipts and emails", href: "/dashboard/settings", done: input.hasLogo },
    { id: "stripe", label: "Connect Stripe", detail: "Needed to receive dues, tickets and donations", href: "/dashboard/settings/payments", done: input.stripeConnected },
    { id: "members", label: "Import your members", detail: "Upload a spreadsheet or add contacts", href: "/dashboard/members/import", done: input.contactsTotal > 0 },
    { id: "tier", label: "Create a membership tier", detail: "Set pricing for your first membership", href: "/dashboard/tiers/new", done: input.tierCount > 0 },
    { id: "event", label: "Publish an event", detail: "Give visitors something to register for", href: "/dashboard/events", done: input.publishedEvents > 0 },
  ];
}

/** Hidden once every step is done. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Get set up</h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {doneCount} of {steps.length} done
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ul className="mt-4 space-y-1">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {!step.done && <span className="block text-xs text-muted-foreground">{step.detail}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
