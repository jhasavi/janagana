import Link from "next/link";
import { ExternalLink, Link2, Settings } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { communityLabel } from "@/lib/pilot/portal-links";
import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";
import type { MappedTenant } from "@/lib/tenant/tenant-resolver";

export function TenantIdentityCard({
  tenant,
  portalUrl,
  mappingStatus,
  hasClerkMembership,
}: {
  tenant: MappedTenant;
  portalUrl: string;
  mappingStatus: string;
  hasClerkMembership: boolean;
}) {
  const mappingOk = tenant.status === "ACTIVE" && hasClerkMembership;

  return (
    <section
      id="tenant-portal-url"
      className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
    >
      <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Now managing</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{communityLabel(tenant.slug)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tenant <span className="font-mono text-gray-800">{tenant.slug}</span>
            <span className="mx-2 text-stone-300">/</span>
            {tenant.name}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tenant.status === "ACTIVE" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
              }`}
            >
              {tenantStatusLabel(tenant.status)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                mappingOk ? "bg-teal-100 text-teal-950" : "bg-red-100 text-red-900"
              }`}
            >
              {mappingStatus}
            </span>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
            Leads, memberships, and event registrations shown here are scoped to this community only.
          </p>
        </div>

        <div className="border-t border-stone-200 bg-stone-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            <Link2 className="h-4 w-4" />
            Live portal
          </p>
          <p className="mt-3 break-all font-mono text-sm text-slate-800">{portalUrl}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <CopyTextButton text={portalUrl} label="Copy portal URL" className="w-full sm:w-auto" />
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Open portal
            <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-stone-50"
          >
            <Settings className="h-4 w-4" />
            Setup
          </Link>
          </div>
        </div>
      </div>

      <details className="border-t border-stone-200 px-5 py-3 text-xs text-slate-600 sm:px-6">
        <summary className="cursor-pointer font-medium text-slate-700">Technical IDs for support</summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Clerk org ID</dt>
            <dd className="mt-0.5 break-all font-mono text-slate-800">{tenant.clerkOrgId}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Tenant ID</dt>
            <dd className="mt-0.5 break-all font-mono text-slate-800">{tenant.id}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
