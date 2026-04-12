import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiCall } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { EventPublicCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EventListItem } from '@/lib/types/event';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantPublicHomepage({ params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await getCurrentTenant();

  if (!tenant || tenant.slug !== tenantSlug) {
    notFound();
  }

  let events: EventListItem[] = [];
  try {
    events = await apiCall<EventListItem[]>(`/events/public/${tenantSlug}`, tenantSlug, null);
  } catch {
    notFound();
  }

  const upcoming = events.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Welcome to {tenant.name}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Keep members connected with events, volunteer opportunities, and clubs.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {tenant.name} uses Jana Gana to make it easy for community members to discover upcoming events, join the team, and get involved.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${tenantSlug}/join`}>Join now</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${tenantSlug}/events`}>View events</Link>
            </Button>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Community highlights</p>
            <div className="grid gap-4">
              <div className="rounded-3xl bg-background/80 p-5">
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="mt-2 text-3xl font-semibold">150+</p>
              </div>
              <div className="rounded-3xl bg-background/80 p-5">
                <p className="text-sm text-muted-foreground">Active clubs</p>
                <p className="mt-2 text-3xl font-semibold">8</p>
              </div>
              <div className="rounded-3xl bg-background/80 p-5">
                <p className="text-sm text-muted-foreground">Volunteer roles</p>
                <p className="mt-2 text-3xl font-semibold">12</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-16 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">What’s happening</p>
            <h2 className="text-3xl font-semibold">Upcoming events</h2>
          </div>
          <Link href={`/${tenantSlug}/events`} className="text-sm font-medium text-primary hover:underline">
            View all events
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No upcoming public events are scheduled yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((event) => (
              <EventPublicCard key={event.id} event={event} primaryColor={tenant.primaryColor ?? undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Why join</p>
          <h3 className="mt-4 text-2xl font-semibold">Easy member onboarding</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign up, view events, and stay connected with community news all in one place.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Volunteer</p>
          <h3 className="mt-4 text-2xl font-semibold">Make an impact</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Explore volunteer roles, sign up for opportunities, and support your community.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Clubs</p>
          <h3 className="mt-4 text-2xl font-semibold">Connect with groups</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Discover the clubs and teams that matter to you and join the ones that fit your interests.
          </p>
        </div>
      </section>
    </div>
  );
}
