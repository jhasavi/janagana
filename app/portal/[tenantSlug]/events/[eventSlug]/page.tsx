import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Ticket, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatCents, formatDate } from "@/lib/utils";
import { getPublishedPortalEvent } from "@/lib/actions/public-portal";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = await params;
  const result = await getPublishedPortalEvent(tenantSlug, eventSlug);

  if (!result.ok || !result.tenant || !result.data) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden">
        <div className="jg-portal-hero jg-portal-gradient p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{result.tenant.name}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{result.data.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
            {result.data.description ?? "Details are coming soon."}
          </p>
        </div>

        <CardBody className="sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="jg-metric">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Date & time
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatDate(result.data.startsAt)}</p>
            </div>
            <div className="jg-metric">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Location
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {result.data.location ?? "To be announced"}
              </p>
            </div>
            <div className="jg-metric">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Ticket className="h-4 w-4 text-primary" />
                Price
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatCents(result.data.priceCents)}</p>
            </div>
            <div className="jg-metric">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <UsersRound className="h-4 w-4 text-primary" />
                Capacity
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {result.data.capacity ?? "Unlimited"}
              </p>
            </div>
          </div>

          {result.data.ticketTypes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-foreground">Tickets</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {result.data.ticketTypes.map((ticket) => (
                  <li key={ticket.id} className="jg-card flex items-start justify-between gap-4 p-3">
                    <div>
                      <p className="font-medium text-foreground">{ticket.name}</p>
                      {ticket.description && <p className="text-muted-foreground">{ticket.description}</p>}
                    </div>
                    <p className="shrink-0 text-right font-medium text-foreground">
                      {formatCents(ticket.priceCents)}
                      {ticket.memberPriceCents !== null && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          member {formatCents(ticket.memberPriceCents)}
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <ButtonLink href={`/portal/${result.tenant.slug}/register/${result.data.slug}`}>
              Register
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
