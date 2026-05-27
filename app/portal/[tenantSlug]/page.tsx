import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublishedPortalEvents } from "@/lib/actions/public-portal";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PortalHomePage({ params }: Props) {
  const { tenantSlug } = await params;
  const result = await listPublishedPortalEvents(tenantSlug);

  if (!result.ok || !result.tenant) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Public portal</p>
        <h2 className="mt-2 text-3xl font-semibold">{result.tenant.name}</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">Browse upcoming classes, workshops, and events.</p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`/portal/${result.tenant.slug}/events`}
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View events
          </Link>
          <Link
            href={`/portal/${result.tenant.slug}/contact?interest=newsletter`}
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Join newsletter
          </Link>
          <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Slug: {result.tenant.slug}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Upcoming events</h3>
        {result.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No published events yet. Check back soon.
          </div>
        ) : (
          result.data.slice(0, 3).map((event) => (
            <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Published event</p>
              <h4 className="mt-2 text-xl font-semibold">{event.title}</h4>
              <p className="mt-2 text-sm text-slate-600">{event.description ?? "No description provided."}</p>
              <div className="mt-4">
                <Link href={`/portal/${result.tenant.slug}/events/${event.slug}`} className="text-sm font-medium text-blue-700 hover:underline">
                  View details
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `${tenantSlug} — Portal`,
  };
}
