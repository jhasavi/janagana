import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

const urgencyChip: Record<PriorityItem["urgency"], string> = {
  high: "bg-accent/10 text-accent",
  medium: "bg-warning/10 text-warning",
  low: "bg-primary/10 text-primary",
};

export type PriorityItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  urgency: "high" | "medium" | "low";
};

export function PriorityQueue({ items }: { items: PriorityItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-emerald-200/80 bg-emerald-50/50">
        <CardBody className="flex items-start gap-3 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-semibold text-emerald-950">You&apos;re caught up</p>
            <p className="mt-1 text-sm text-emerald-900/80">
              No urgent items right now. Check recent activity below or preview your member portal.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            {items.length} item{items.length === 1 ? "" : "s"} need attention
          </p>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl bg-muted/50 px-3.5 py-3 transition-colors hover:bg-secondary"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgencyChip[item.urgency]}`}>
                  <AlertCircle className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{item.detail}</p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm sm:inline-flex">
                  Resolve
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function buildPriorityItems(input: {
  expiringThisMonth: number;
  expiredMembers: number;
  draftEvents: number;
  contactsTotal: number;
  publishedEvents: number;
  hasRegistrations: boolean;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (input.expiredMembers > 0) {
    items.push({
      id: "expired-members",
      label: "Follow up on expired memberships",
      detail: `${input.expiredMembers} member${input.expiredMembers === 1 ? "" : "s"} may need renewal`,
      href: "/dashboard/memberships/renewals?filter=expired",
      urgency: "high",
    });
  }

  if (input.expiringThisMonth > 0) {
    items.push({
      id: "expiring-soon",
      label: "Memberships expiring this month",
      detail: `${input.expiringThisMonth} renewal${input.expiringThisMonth === 1 ? "" : "s"} coming up`,
      href: "/dashboard/memberships/renewals?filter=expiring_30",
      urgency: "medium",
    });
  }

  if (input.contactsTotal === 0) {
    items.push({
      id: "import-contacts",
      label: "Add your member list",
      detail: "Import a spreadsheet or test the portal contact form",
      href: "/dashboard/members/import",
      urgency: "high",
    });
  }

  if (input.publishedEvents === 0) {
    items.push({
      id: "publish-event",
      label: "Publish your first event",
      detail: "Visitors need at least one live event to register",
      href: "/dashboard/events",
      urgency: "high",
    });
  } else if (input.draftEvents > 0) {
    items.push({
      id: "draft-events",
      label: "Finish draft events",
      detail: `${input.draftEvents} event${input.draftEvents === 1 ? "" : "s"} not yet published`,
      href: "/dashboard/events",
      urgency: "medium",
    });
  }

  if (input.publishedEvents > 0 && !input.hasRegistrations) {
    items.push({
      id: "test-registration",
      label: "Test event registration",
      detail: "Register in an incognito window to confirm the flow works",
      href: "/dashboard/events",
      urgency: "low",
    });
  }

  return items.slice(0, 4);
}
