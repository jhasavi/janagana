import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublishedPortalEvents } from "@/lib/actions/public-portal";

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
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">{result.tenant.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Events</h1>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No published events yet. Check back soon.
        </div>
      ) : (
        <div className="grid gap-4">
          {result.data.map((event) => (
            <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{event.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{event.description ?? "No description provided."}</p>
                </div>
                <Link href={`/portal/${result.tenant.slug}/events/${event.slug}`} className="text-sm font-medium text-blue-700 hover:underline">
                  View details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div>
        <Link className="text-sm text-blue-700 underline" href={`/portal/${result.tenant.slug}`}>
          Back to portal home
        </Link>
      </div>
    </section>
  );
}
