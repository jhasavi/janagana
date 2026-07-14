import Link from "next/link";
import { CalendarCheck, Contact as ContactIcon, CreditCard, Mail } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import type { ActivityItem, ActivityItemType } from "@/lib/dashboard/activity-feed";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const ICONS: Record<ActivityItemType, typeof ContactIcon> = {
  contact: ContactIcon,
  registration: CalendarCheck,
  payment: CreditCard,
  communication: Mail,
};

const TONE: Record<ActivityItemType, string> = {
  contact: "bg-primary/10 text-primary",
  registration: "bg-accent/10 text-accent",
  payment: "bg-success/10 text-success",
  communication: "bg-muted text-muted-foreground",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Contacts, registrations, payments, and sends — one timeline.</p>
        </div>
      </div>
      <CardBody className="p-0">
        {items.length === 0 ? (
          <div className="jg-surface-muted m-4 p-5 text-sm text-muted-foreground sm:m-6">
            Nothing here yet. Activity from contacts, registrations, payments, and communications will show up as it happens.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => {
              const Icon = ICONS[item.type];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/60 sm:px-6"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[item.type]}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={formatDate(item.timestamp)}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
