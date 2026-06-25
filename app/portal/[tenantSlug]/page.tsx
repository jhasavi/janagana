import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, HeartHandshake, Mail, MapPin } from "lucide-react";
import { listPublishedPortalEvents } from "@/lib/actions/public-portal";
import { formatDate } from "@/lib/utils";

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
    <section className="space-y-10">
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">Community hub</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              {result.tenant.name}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              {result.tenant.publicTagline ?? "Find upcoming classes, workshops, gatherings, memberships, and ways to stay connected."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/portal/${result.tenant.slug}/events`}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
              >
                <CalendarDays className="h-4 w-4" />
                View events
              </Link>
              <Link
                href={`/portal/${result.tenant.slug}/contact?interest=newsletter`}
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-stone-50"
              >
                <Mail className="h-4 w-4" />
                Join newsletter
              </Link>
              <Link
                href={`/portal/${result.tenant.slug}/join`}
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-stone-50"
              >
                <HeartHandshake className="h-4 w-4" />
                Membership
              </Link>
              <Link
                href={`/portal/${result.tenant.slug}/donate`}
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-stone-50"
              >
                Donate
              </Link>
            </div>
          </div>

          <div className="border-t border-stone-200 bg-teal-950 p-6 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="text-sm font-medium text-teal-100">Start here</p>
            <div className="mt-5 grid gap-3">
              <PortalAction href={`/portal/${result.tenant.slug}/events`} title="Attend an event" detail={`${result.data.length} published event${result.data.length === 1 ? "" : "s"}`} />
              <PortalAction href={`/portal/${result.tenant.slug}/join`} title="Become a member" detail="Choose an available membership" />
              <PortalAction href={`/portal/${result.tenant.slug}/donate`} title="Make a donation" detail="Support the community with a one-time gift" />
              <PortalAction href={`/portal/${result.tenant.slug}/contact?interest=newsletter`} title="Stay in touch" detail="Get updates from the community" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureTile icon={<CalendarDays className="h-5 w-5" />} title="Events" text="Browse published programs and register in a few steps." />
        <FeatureTile icon={<HeartHandshake className="h-5 w-5" />} title="Donate" text="Make a one-time gift to support community programs." />
        <FeatureTile icon={<Mail className="h-5 w-5" />} title="Updates" text="Share your interests so organizers can follow up clearly." />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-800">Upcoming</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Events and workshops</h3>
          </div>
          <Link
            href={`/portal/${result.tenant.slug}/events`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-slate-950"
          >
            All events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {result.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-slate-600">
            No published events yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {result.data.slice(0, 3).map((event) => (
              <article key={event.id} className="flex min-h-56 flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                  {formatDate(event.startsAt)}
                </p>
                <h4 className="mt-3 text-xl font-semibold leading-snug text-slate-950">{event.title}</h4>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.description ?? "Details are coming soon."}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{event.location ?? "Location to be announced"}</span>
                </div>
                <Link href={`/portal/${result.tenant.slug}/events/${event.slug}`} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-teal-900 hover:text-slate-950">
                  View details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PortalAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-white/15 bg-white/10 p-4 hover:bg-white/15">
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-sm text-teal-100">{detail}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function FeatureTile({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-900">{icon}</div>
      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `${tenantSlug} — Portal`,
  };
}
