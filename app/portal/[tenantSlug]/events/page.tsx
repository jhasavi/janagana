import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { listPublishedPortalEvents } from "@/lib/actions/public-portal";
import { formatDate } from "@/lib/utils";

export default async function TenantEventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const result = await listPublishedPortalEvents(tenantSlug);

  if (!result.ok || !result.tenant) {
    notFound();
  }

  return (
    <section className="space-y-7">
      <Card>
        <CardBody className="sm:p-8">
          <p className="jg-eyebrow">{result.tenant.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Events and workshops</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Browse what is open now. Each event page includes timing, location, ticket details, and registration.
          </p>
        </CardBody>
      </Card>

      {result.data.length === 0 ? (
        <div className="jg-surface-muted p-6 text-sm text-muted-foreground">
          No published events yet. Check back soon.
        </div>
      ) : (
        <div className="grid gap-4">
          {result.data.map((event) => (
            <article key={event.id} className="jg-card p-5">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatDate(event.startsAt)}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{event.location ?? "Location to be announced"}</span>
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-foreground">{event.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {event.description ?? "Details are coming soon."}
                  </p>
                </div>
                <ButtonLink href={`/portal/${result.tenant.slug}/events/${event.slug}`}>
                  View details
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
