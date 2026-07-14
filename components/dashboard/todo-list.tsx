import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export type TodoItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  urgency: "high" | "medium" | "low";
};

const urgencyDot: Record<TodoItem["urgency"], string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-primary",
};

/** Combined, deduplicated to-do items — replaces the old PriorityQueue + NextStepsPanel split. */
export function buildTodoItems(input: {
  contactsTotal: number;
  publishedEvents: number;
  draftEvents: number;
  hasRegistrations: boolean;
  expiredMembers: number;
  expiringThisMonth: number;
}): TodoItem[] {
  const items: TodoItem[] = [];

  if (input.expiredMembers > 0) {
    items.push({
      id: "expired-members",
      label: "Follow up on expired memberships",
      detail: `${input.expiredMembers} member${input.expiredMembers === 1 ? "" : "s"} may need renewal`,
      href: "/dashboard/memberships/renewals?filter=expired",
      urgency: "high",
    });
  }

  if (input.contactsTotal === 0) {
    items.push({
      id: "add-contacts",
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
      id: "finish-drafts",
      label: "Finish draft events",
      detail: `${input.draftEvents} event${input.draftEvents === 1 ? "" : "s"} not yet published`,
      href: "/dashboard/events",
      urgency: "medium",
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

  if (input.publishedEvents > 0 && !input.hasRegistrations) {
    items.push({
      id: "test-registration",
      label: "Test event registration",
      detail: "Register in an incognito window to confirm the flow works",
      href: "/dashboard/events",
      urgency: "low",
    });
  }

  return items.slice(0, 6);
}

export function TodoList({ items }: { items: TodoItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardBody className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">You&apos;re all caught up</p>
            <p className="mt-0.5 text-sm text-muted-foreground">No open to-dos right now.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-1 py-3">
        <div className="flex items-center justify-between px-1.5 pb-2">
          <h2 className="text-sm font-semibold text-foreground">To-do</h2>
          <span className="text-xs font-medium text-muted-foreground">{items.length} open</span>
        </div>
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-secondary"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors group-hover:border-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${urgencyDot[item.urgency]}`} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
