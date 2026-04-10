import { requireMember } from '@/lib/auth';
import { MemberGreeting } from '@/components/portal/MemberGreeting';
import { MembershipCard } from '@/components/portal/MembershipCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function PortalPage() {
  const member = await requireMember();
  const firstName = member.firstName || 'Member';
  const tier = 'Gold';
  const memberNumber = member.clerkId.slice(0, 8).toUpperCase();

  return (
    <div className="space-y-8">
      <MemberGreeting firstName={firstName} tier={tier} />

      <section className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Events attended', value: '8' },
              { label: 'Volunteer hours', value: '24' },
              { label: 'Clubs joined', value: '4' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Announcements</p>
                <p className="mt-1 text-sm text-muted-foreground">Latest news from your organisation.</p>
              </div>
              <Badge variant="secondary">New</Badge>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                { title: 'Annual summer meetup is open for registration', badge: 'Events' },
                { title: 'Membership renewal window closes in 10 days', badge: 'Billing' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="outline">{item.badge}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Stay tuned for event details and registration deadlines.</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MembershipCard
          name={`${member.firstName} ${member.lastName}`.trim() || 'Member'}
          tier={tier}
          memberNumber={memberNumber}
          expiresAt="June 10, 2026"
          progress={78}
          isExpiringSoon
          onRenew={() => {
            window.location.href = '/portal/membership';
          }}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Upcoming events</h2>
            <p className="text-sm text-muted-foreground">Next few things you may want to sign up for.</p>
          </div>
          <Button variant="ghost" asChild>
            <a href="/portal/events">Browse events</a>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {['Tournament kickoff', 'Community clean-up', 'Summer social'].map((event) => (
            <div key={event} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">June 14 · 10:00 AM</p>
              <h3 className="mt-3 text-lg font-semibold">{event}</h3>
              <p className="mt-2 text-sm text-muted-foreground">Register now to reserve your spot.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Volunteer shifts</h2>
            <Button variant="ghost" asChild>
              <a href="/portal/volunteer">View all</a>
            </Button>
          </div>
          <div className="grid gap-4">
            {[
              { title: 'Park welcome team', date: 'June 16 · 9:00 AM' },
              { title: 'Fundraiser setup crew', date: 'June 22 · 2:00 PM' },
            ].map((shift) => (
              <div key={shift.title} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">{shift.date}</p>
                <h3 className="mt-2 text-lg font-semibold">{shift.title}</h3>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Club highlights</h2>
            <Button variant="ghost" asChild>
              <a href="/portal/clubs">See clubs</a>
            </Button>
          </div>
          <div className="grid gap-4">
            {['Eastside Runners', 'Community Outreach', 'Board Game Club'].map((club) => (
              <div key={club} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{club}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Latest post: Weekly meetup summary and action items.</p>
                  </div>
                  <Badge variant="outline">New</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
