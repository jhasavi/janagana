import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
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
      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-800">{result.tenant.name}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Events and workshops</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Browse what is open now. Each event page includes timing, location, ticket details, and registration.
        </p>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-slate-600">
          No published events yet. Check back soon.
        </div>
      ) : (
        <div className="grid gap-4">
          {result.data.map((event) => (
            <article key={event.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-teal-800" />
                      {formatDate(event.startsAt)}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-teal-800" />
                      <span className="truncate">{event.location ?? "Location to be announced"}</span>
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">{event.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{event.description ?? "Details are coming soon."}</p>
                </div>
                <Link href={`/portal/${result.tenant.slug}/events/${event.slug}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
                  View details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-slate-950" href={`/portal/${result.tenant.slug}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to portal home
        </Link>
      </div>
    </section>
  );
}
