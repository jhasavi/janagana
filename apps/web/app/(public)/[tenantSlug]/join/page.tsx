import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';

export default async function TenantJoinPage({ params }: { params: { tenantSlug: string } }) {
  const tenant = await getCurrentTenant();
  if (!tenant || tenant.slug !== params.tenantSlug) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        <div className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Join {tenant.name}</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Become part of the community.</h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            Join members, register for events, and stay connected with clubs, volunteers, and community news.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <h2 className="text-xl font-semibold">Member benefits</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Exclusive member events</li>
              <li>Volunteer opportunities</li>
              <li>Club announcements and updates</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <h2 className="text-xl font-semibold">What to expect</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Fast sign-up with secure account creation</li>
              <li>Personalized access to the member portal</li>
              <li>Calendar reminders and event details</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={`/member-register/${tenant.slug}`}>Create account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${tenant.slug}/events`}>Browse events</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
