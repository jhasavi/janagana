import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Ticket, UsersRound } from "lucide-react";
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
    <main className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="bg-teal-950 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">{result.tenant.name}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{result.data.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-teal-50">{result.data.description ?? "Details are coming soon."}</p>
        </div>

        <div className="p-6 sm:p-8">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <dt className="flex items-center gap-2 text-slate-500">
              <CalendarDays className="h-4 w-4 text-teal-800" />
              Date & time
            </dt>
            <dd className="mt-1 font-medium text-slate-900">{formatDate(result.data.startsAt)}</dd>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <dt className="flex items-center gap-2 text-slate-500">
              <MapPin className="h-4 w-4 text-teal-800" />
              Location
            </dt>
            <dd className="mt-1 font-medium text-slate-900">{result.data.location ?? "To be announced"}</dd>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <dt className="flex items-center gap-2 text-slate-500">
              <Ticket className="h-4 w-4 text-teal-800" />
              Price
            </dt>
            <dd className="mt-1 font-medium text-slate-900">{formatCents(result.data.priceCents)}</dd>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <dt className="flex items-center gap-2 text-slate-500">
              <UsersRound className="h-4 w-4 text-teal-800" />
              Capacity
            </dt>
            <dd className="mt-1 font-medium text-slate-900">{result.data.capacity ?? "Unlimited"}</dd>
          </div>
        </dl>

        {result.data.ticketTypes.length > 0 && (
          <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Tickets</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {result.data.ticketTypes.map((ticket) => (
                <li key={ticket.id} className="flex items-start justify-between gap-4 rounded-md bg-white p-3 ring-1 ring-stone-200">
                  <div>
                    <p className="font-medium text-slate-900">{ticket.name}</p>
                    {ticket.description && <p className="text-slate-600">{ticket.description}</p>}
                  </div>
                  <p className="shrink-0 text-right font-medium text-slate-900">
                    {formatCents(ticket.priceCents)}
                    {ticket.memberPriceCents !== null && (
                      <span className="block text-xs font-normal text-slate-500">
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
          <Link
            href={`/portal/${result.tenant.slug}/register/${result.data.slug}`}
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Register
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
