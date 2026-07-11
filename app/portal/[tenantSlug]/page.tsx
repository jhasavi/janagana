import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, HeartHandshake, Mail, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
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

  const slug = result.tenant.slug;

  return (
    <section className="space-y-10">
      <div className="jg-portal-hero">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="jg-eyebrow">Welcome</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {result.tenant.name}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {result.tenant.publicTagline ??
                "Find upcoming classes, workshops, gatherings, memberships, and ways to stay connected."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/portal/${slug}/events`} size="lg">
                <CalendarDays className="h-4 w-4" />
                View events
              </ButtonLink>
              <ButtonLink href={`/portal/${slug}/contact?interest=newsletter`} variant="secondary" size="lg">
                <Mail className="h-4 w-4" />
                Join newsletter
              </ButtonLink>
              <ButtonLink href={`/portal/${slug}/join`} variant="secondary" size="lg">
                <HeartHandshake className="h-4 w-4" />
                Membership
              </ButtonLink>
            </div>
          </div>

          <div className="jg-portal-gradient border-t border-border/20 p-6 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <p className="text-sm font-medium text-white/80">Quick paths</p>
            <div className="mt-5 grid gap-3">
              <PortalAction
                href={`/portal/${slug}/events`}
                title="Attend an event"
                detail={`${result.data.length} published event${result.data.length === 1 ? "" : "s"}`}
              />
              <PortalAction href={`/portal/${slug}/join`} title="Become a member" detail="Choose an available plan" />
              <PortalAction href={`/portal/${slug}/donate`} title="Make a donation" detail="Support community programs" />
              <PortalAction
                href={`/portal/${slug}/contact?interest=newsletter`}
                title="Stay in touch"
                detail="Get updates from the community"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureTile
          icon={<CalendarDays className="h-5 w-5" />}
          tone="primary"
          title="Events"
          text="Browse programs and register in a few steps."
        />
        <FeatureTile
          icon={<HeartHandshake className="h-5 w-5" />}
          tone="accent"
          title="Membership"
          text="Join as a member and support your community."
        />
        <FeatureTile
          icon={<Mail className="h-5 w-5" />}
          tone="success"
          title="Updates"
          text="Share your interests so organizers can follow up."
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="jg-eyebrow">Upcoming</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Events and workshops</h3>
          </div>
          <Link
            href={`/portal/${slug}/events`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground"
          >
            All events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {result.data.length === 0 ? (
          <div className="jg-surface-muted p-6 text-sm text-muted-foreground">
            No published events yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {result.data.slice(0, 3).map((event) => (
              <article key={event.id} className="jg-card flex min-h-56 flex-col overflow-hidden p-0">
                <div className="flex items-center gap-3 bg-muted/60 px-5 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {formatDate(event.startsAt).slice(0, 3)}
                    </span>
                    <span className="text-sm font-extrabold leading-tight">{new Date(event.startsAt).getDate()}</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {formatDate(event.startsAt)}
                  </p>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h4 className="text-xl font-bold leading-snug text-foreground">{event.title}</h4>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {event.description ?? "Details are coming soon."}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{event.location ?? "Location to be announced"}</span>
                  </div>
                  <Link
                    href={`/portal/${slug}/events/${event.slug}`}
                    className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-primary hover:text-accent"
                  >
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
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
    <Link href={href} className="group rounded-xl border border-white/15 bg-white/10 p-4 transition-colors hover:bg-white/15">
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-sm text-white/75">{detail}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function FeatureTile({
  icon,
  title,
  text,
  tone = "primary",
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone?: "primary" | "accent" | "success";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <div className="jg-card p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
      <h3 className="mt-4 font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `${tenantSlug} — Community portal`,
  };
}
