import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin } from 'lucide-react';

export default async function TenantContactPage({ params }: { params: { tenantSlug: string } }) {
  const tenant = await getCurrentTenant();
  if (!tenant || tenant.slug !== params.tenantSlug) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        <div className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Contact {tenant.name}</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">We’re here to help.</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Have a question about membership, events, or volunteering? Reach out and we’ll get back to you soon.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <div className="flex items-center gap-3 text-primary">
              <Mail className="h-5 w-5" />
              <p className="font-semibold">Email</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">support@orgflow.app</p>
          </div>
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <div className="flex items-center gap-3 text-primary">
              <Phone className="h-5 w-5" />
              <p className="font-semibold">Phone</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">(555) 123-4567</p>
          </div>
          <div className="rounded-3xl border border-border bg-background/80 p-6">
            <div className="flex items-center gap-3 text-primary">
              <MapPin className="h-5 w-5" />
              <p className="font-semibold">Location</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Community center or campus headquarters</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Want to join or volunteer?</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href={`/${tenant.slug}/join`}>Join now</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${tenant.slug}/volunteer`}>Volunteer</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
