import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Pricing</p>
        <h1 className="text-4xl font-bold tracking-tight">Plans for every community.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Start with everything your organization needs to run events, volunteers, clubs, and membership programs.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Community</h2>
              <p className="text-sm text-muted-foreground">Great for clubs and local groups.</p>
            </div>
            <Badge variant="secondary">Popular</Badge>
          </div>
          <div className="mt-8">
            <p className="text-4xl font-bold">Free</p>
            <p className="mt-2 text-sm text-muted-foreground">Start managing memberships and events without cost.</p>
          </div>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            <li>Up to 250 members</li>
            <li>Event registration</li>
            <li>Volunteer scheduling</li>
          </ul>
          <Button asChild className="mt-8 w-full">
            <Link href="/register">Get started</Link>
          </Button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Team</h2>
          <p className="mt-2 text-sm text-muted-foreground">For growing organizations with multiple admins.</p>
          <div className="mt-8">
            <p className="text-4xl font-bold">$49</p>
            <p className="mt-2 text-sm text-muted-foreground">per month</p>
          </div>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            <li>Unlimited members</li>
            <li>Custom branding</li>
            <li>Volunteer coordination</li>
          </ul>
          <Button asChild className="mt-8 w-full">
            <Link href="/register">Start free trial</Link>
          </Button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Enterprise</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tailored solutions for larger communities.</p>
          <div className="mt-8">
            <p className="text-4xl font-bold">Custom</p>
            <p className="mt-2 text-sm text-muted-foreground">Contact us for pricing.</p>
          </div>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            <li>Dedicated onboarding</li>
            <li>Advanced reporting</li>
            <li>Private tenant domains</li>
          </ul>
          <Button asChild className="mt-8 w-full">
            <Link href="/register">Contact sales</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
