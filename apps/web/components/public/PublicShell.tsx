import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TenantPublicNavProps {
  tenantSlug: string;
  tenantName: string;
}

export function TenantPublicNav({ tenantSlug, tenantName }: TenantPublicNavProps) {
  return (
    <header className="border-b border-border bg-background/95 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={`/${tenantSlug}`} className="text-lg font-semibold tracking-tight">
          {tenantName}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href={`/${tenantSlug}`} className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link href={`/${tenantSlug}/events`} className="transition-colors hover:text-foreground">
            Events
          </Link>
          <Link href={`/${tenantSlug}/join`} className="transition-colors hover:text-foreground">
            Join
          </Link>
          <Link href={`/${tenantSlug}/volunteer`} className="transition-colors hover:text-foreground">
            Volunteer
          </Link>
          <Link href={`/${tenantSlug}/contact`} className="transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/${tenantSlug}/join`}>Become a member</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function MarketingHeader() {
  return (
    <header className="border-b border-border bg-background/95 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          OrgFlow
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href="/features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/register" className="transition-colors hover:text-foreground">
            Register
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">OrgFlow</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Membership, events, volunteer, and club management for communities of every size.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link href="/features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/register" className="transition-colors hover:text-foreground">
            Register
          </Link>
        </div>
      </div>
    </footer>
  );
}
