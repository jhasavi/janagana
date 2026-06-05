import Link from "next/link";
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
      className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">You are managing</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{communityLabel(tenant.slug)}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tenant <span className="font-mono text-gray-800">{tenant.slug}</span>
            <span className="mx-2 text-gray-300">·</span>
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
                mappingOk ? "bg-blue-100 text-blue-900" : "bg-red-100 text-red-900"
              }`}
            >
              {mappingStatus}
            </span>
          </div>

          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50/80 p-3">
            <p className="text-xs font-medium text-blue-900">Live public portal</p>
            <p className="mt-1 break-all font-mono text-sm text-blue-950">{portalUrl}</p>
            <p className="mt-1 text-xs text-blue-800">
              Website visitors use this URL — not your Clerk sign-in. Leads and registrations land under this tenant only.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <CopyTextButton text={portalUrl} label="Copy portal URL" className="w-full sm:w-auto" />
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Open portal ↗
          </a>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            Mapping & diagnostics
          </Link>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 border-t border-gray-200 pt-4 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="font-medium text-gray-500">Clerk org ID</dt>
          <dd className="mt-0.5 break-all font-mono text-gray-800">{tenant.clerkOrgId}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Tenant ID</dt>
          <dd className="mt-0.5 break-all font-mono text-gray-800">{tenant.id}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Mapping</dt>
          <dd className="mt-0.5 text-gray-800">
            {tenantMappingStatusLabel({
              tenantStatus: tenant.status,
              hasClerkMembership,
            })}
          </dd>
        </div>
      </dl>
    </section>
  );
}
