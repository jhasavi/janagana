import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";

export default async function PortalTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Public portal</p>
              <h1 className="text-lg font-semibold">{tenant.name}</h1>
              {tenant.publicTagline ? (
                <p className="mt-0.5 text-sm text-slate-600">{tenant.publicTagline}</p>
              ) : null}
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`/portal/${tenant.slug}`} className="text-slate-700 hover:text-slate-950">
              Home
            </Link>
            <Link href={`/portal/${tenant.slug}/events`} className="text-slate-700 hover:text-slate-950">
              Events
            </Link>
            <Link href={`/portal/${tenant.slug}/join`} className="text-slate-700 hover:text-slate-950">
              Join
            </Link>
            <Link href={`/portal/${tenant.slug}/contact`} className="text-slate-700 hover:text-slate-950">
              Stay updated
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
