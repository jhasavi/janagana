import Link from "next/link";
import { notFound } from "next/navigation";
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{result.tenant.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{result.data.title}</h1>
        <p className="mt-4 text-sm text-slate-600">{result.data.description ?? "No description provided."}</p>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Date & time</dt>
            <dd className="mt-1 font-medium text-slate-900">{formatDate(result.data.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Location</dt>
            <dd className="mt-1 font-medium text-slate-900">{result.data.location ?? "To be announced"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Price</dt>
            <dd className="mt-1 font-medium text-slate-900">{formatCents(result.data.priceCents)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Capacity</dt>
            <dd className="mt-1 font-medium text-slate-900">{result.data.capacity ?? "Unlimited"}</dd>
          </div>
        </dl>

        {result.data.ticketTypes.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Tickets</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {result.data.ticketTypes.map((ticket) => (
                <li key={ticket.id} className="flex items-start justify-between gap-4">
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
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
