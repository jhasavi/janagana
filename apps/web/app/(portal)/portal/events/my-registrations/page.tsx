import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Ticket } from 'lucide-react';
import { requireMember } from '@/lib/auth';
import { apiCall } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import type { EventRegistration, RegistrationStatus } from '@/lib/types/event';

const STATUS_LABELS: Record<RegistrationStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'success' },
  CANCELED: { label: 'Canceled', variant: 'destructive' },
  ATTENDED: { label: 'Attended', variant: 'info' },
  NO_SHOW: { label: 'No Show', variant: 'secondary' },
};

// Minimal shape returned by member's registrations (if API supports it)
interface MemberRegistration {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  quantity: number;
  event: {
    id: string;
    title: string;
    startsAt: string;
    coverImageUrl: string | null;
    format: string;
  };
  ticket: {
    name: string;
    price: number;
  } | null;
}

export default async function MyRegistrationsPage() {
  const member = await requireMember();
  const tenantId = member.tenantId!;

  let registrations: MemberRegistration[] = [];
  try {
    // Fetch registrations for the current member across all events
    // The API returns all registrations; filter by memberId on client side
    // or use a dedicated member endpoint when available
    const result = await apiCall<{ data: MemberRegistration[] }>(
      `/members/registrations`,
      tenantId,
      null,
    );
    registrations = result.data ?? [];
  } catch {
    // Endpoint may not exist yet — show empty state gracefully
  }

  const upcoming = registrations.filter(
    (r) => r.status !== 'CANCELED' && new Date(r.event.startsAt) >= new Date(),
  );
  const past = registrations.filter(
    (r) => r.status !== 'CANCELED' && new Date(r.event.startsAt) < new Date(),
  );
  const canceled = registrations.filter((r) => r.status === 'CANCELED');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Events you have registered for.
        </p>
      </div>

      {registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">You haven't registered for any events yet.</p>
          <Link
            href="/portal/events"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Browse Events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Upcoming" registrations={upcoming} />
          )}
          {past.length > 0 && (
            <Section title="Past" registrations={past} />
          )}
          {canceled.length > 0 && (
            <Section title="Canceled" registrations={canceled} />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  registrations,
}: {
  title: string;
  registrations: MemberRegistration[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      <div className="divide-y rounded-xl border bg-card">
        {registrations.map((reg) => {
          const cfg = STATUS_LABELS[reg.status];
          return (
            <Link
              key={reg.id}
              href={`/portal/events/${reg.event.id}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40"
            >
              {reg.event.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reg.event.coverImageUrl}
                  alt=""
                  className="h-12 w-16 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted shrink-0">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{reg.event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(reg.event.startsAt), 'MMM d, yyyy · h:mm a')}
                </p>
                {reg.ticket && (
                  <p className="text-xs text-muted-foreground">
                    {reg.ticket.name}
                    {reg.quantity > 1 && ` × ${reg.quantity}`}
                    {reg.ticket.price > 0 &&
                      ` — $${(reg.ticket.price / 100).toFixed(2)}`}
                  </p>
                )}
              </div>
              <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
