"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Gift, HeartHandshake, Home, Mail, UserCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalShellTenant = {
  name: string;
  slug: string;
  logoUrl: string | null;
  publicTagline: string | null;
  directoryEnabled?: boolean;
};

export type PortalShellMember = {
  firstName: string;
} | null;

const baseNavItems: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  cta?: boolean;
}> = [
  { href: "", label: "Home", icon: Home, exact: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/join", label: "Join", icon: HeartHandshake },
  { href: "/donate", label: "Donate", icon: Gift },
  { href: "/contact", label: "Stay updated", icon: Mail, cta: true },
];

function TenantMark({ tenant }: { tenant: PortalShellTenant }) {
  if (tenant.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={tenant.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-border/80 shadow-sm" />
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
      {tenant.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function PortalShell({
  tenant,
  member = null,
  children,
}: {
  tenant: PortalShellTenant;
  member?: PortalShellMember;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const embed = searchParams.get("embed") === "1";
  const base = `/portal/${tenant.slug}`;

  const navItems = [
    ...baseNavItems,
    ...(tenant.directoryEnabled
      ? [{ href: "/directory", label: "Directory", icon: Users }]
      : []),
    {
      href: member ? "/account" : "/account/sign-in",
      label: member ? member.firstName : "Sign in",
      icon: UserCircle,
    },
  ];

  if (embed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-center gap-3 border-b border-border/70 pb-4">
            <TenantMark tenant={tenant} />
            <div>
              <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
              {tenant.publicTagline ? <p className="text-xs text-muted-foreground">{tenant.publicTagline}</p> : null}
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href={base} className="flex min-w-0 items-center gap-3">
            <TenantMark tenant={tenant} />
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight">{tenant.name}</h1>
              {tenant.publicTagline ? (
                <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{tenant.publicTagline}</p>
              ) : null}
            </div>
          </Link>
          <nav className="hidden flex-wrap items-center gap-1 text-sm md:flex">
            {navItems.map((item) => {
              const href = item.href ? `${base}${item.href}` : base;
              const active = item.exact ? pathname === base : pathname.startsWith(`${base}${item.href}`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium transition-colors",
                    item.cta
                      ? "bg-accent font-bold text-accent-foreground shadow-sm hover:bg-accent/90"
                      : active
                        ? "bg-primary/10 font-bold text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-md md:hidden">
        <div
          className="mx-auto grid max-w-lg gap-1 px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const href = item.href ? `${base}${item.href}` : base;
            const active = item.exact ? pathname === base : pathname.startsWith(`${base}${item.href}`);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-16 md:hidden" aria-hidden />
    </div>
  );
}
