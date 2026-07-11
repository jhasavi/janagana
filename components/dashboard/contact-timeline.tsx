import Link from "next/link";
import { CreditCard, Mail, ScrollText, TicketCheck, UserPlus } from "lucide-react";
import type { TimelineEvent, TimelineEventKind } from "@/lib/contacts/timeline";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const KIND_STYLE: Record<TimelineEventKind, { icon: typeof UserPlus; tone: string }> = {
  created: { icon: UserPlus, tone: "bg-primary/10 text-primary" },
  imported: { icon: UserPlus, tone: "bg-primary/10 text-primary" },
  membership: { icon: ScrollText, tone: "bg-accent/10 text-accent" },
  registration: { icon: TicketCheck, tone: "bg-success/10 text-success" },
  payment: { icon: CreditCard, tone: "bg-warning/10 text-warning" },
  communication: { icon: Mail, tone: "bg-muted text-muted-foreground" },
};

export function ContactTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const { icon: Icon, tone } = KIND_STYLE[event.kind];
        const isLast = index === events.length - 1;
        const content = (
          <>
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              {!isLast && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
            </div>
            <div className={`min-w-0 pb-6 ${isLast ? "" : ""}`}>
              <p className="text-sm font-bold text-foreground">{event.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground/80" title={formatDate(event.at)}>
                {formatRelativeTime(event.at)}
              </p>
            </div>
          </>
        );

        return (
          <li key={event.id} className="flex gap-3">
            {event.href ? (
              <Link href={event.href} className="flex gap-3 hover:opacity-80">
                {content}
              </Link>
            ) : (
              <div className="flex gap-3">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
