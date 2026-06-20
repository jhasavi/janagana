"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, HeartHandshake, Mail, UsersRound } from "lucide-react";

export type PortalShellTenant = {
  name: string;
  slug: string;
  logoUrl: string | null;
  publicTagline: string | null;
};

export function PortalShell({
  tenant,
  children,
}: {
  tenant: PortalShellTenant;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";

  if (embed) {
    return (
      <div className="min-h-screen bg-[#f7f3ec] text-slate-950">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-center gap-3 border-b border-stone-200/80 pb-4">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-stone-200" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-semibold text-white">
                {tenant.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">{tenant.name}</p>
              {tenant.publicTagline ? <p className="text-xs text-slate-600">{tenant.publicTagline}</p> : null}
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-slate-950">
      <header className="border-b border-stone-200/80 bg-[#fffaf2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href={`/portal/${tenant.slug}`} className="flex min-w-0 items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-11 w-11 rounded-lg object-cover ring-1 ring-stone-200" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-sm font-semibold text-white">
                {tenant.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Community portal</p>
              <h1 className="text-lg font-semibold leading-tight">{tenant.name}</h1>
              {tenant.publicTagline ? (
                <p className="mt-0.5 max-w-xl text-sm text-slate-600">{tenant.publicTagline}</p>
              ) : null}
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link
              href={`/portal/${tenant.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-white hover:text-slate-950"
            >
              <UsersRound className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link
              href={`/portal/${tenant.slug}/events`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-white hover:text-slate-950"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Events</span>
            </Link>
            <Link
              href={`/portal/${tenant.slug}/join`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-white hover:text-slate-950"
            >
              <HeartHandshake className="h-4 w-4" />
              <span>Join</span>
            </Link>
            <Link
              href={`/portal/${tenant.slug}/contact`}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-teal-900"
            >
              <Mail className="h-4 w-4" />
              <span>Stay updated</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}
