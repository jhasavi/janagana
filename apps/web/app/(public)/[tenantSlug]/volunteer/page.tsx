import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';

export default async function TenantVolunteerPage({ params }: { params: { tenantSlug: string } }) {
  const tenant = await getCurrentTenant();
  if (!tenant || tenant.slug !== params.tenantSlug) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        <div className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Volunteer with {tenant.name}</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Help your community thrive.</h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            Find meaningful volunteer opportunities, support events, and make a positive difference.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <h2 className="text-xl font-semibold">Why volunteer?</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Work alongside fellow members.</li>
              <li>Learn leadership and event coordination skills.</li>
              <li>Support the causes you care about.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <h2 className="text-xl font-semibold">Your next steps</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Review open roles and descriptions.</li>
              <li>Sign up for shifts and upcoming events.</li>
              <li>Track your volunteer hours in one place.</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={`/${tenant.slug}/contact`}>Get involved</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${tenant.slug}/events`}>View volunteer events</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
