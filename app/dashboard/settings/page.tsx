import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantByClerkOrgId } from "@/lib/tenant";

export default async function SettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const tenant = await getTenantByClerkOrgId(orgId);
  if (!tenant) redirect("/onboarding/create-organization");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Organization name</dt>
            <dd className="mt-1 text-sm text-gray-900">{tenant.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Portal slug</dt>
            <dd className="mt-1 text-sm font-mono text-gray-900">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Public portal URL</dt>
            <dd className="mt-1">
              <a
                href={`/portal/${tenant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                /portal/{tenant.slug} ↗
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
            <dd className="mt-1 text-xs font-mono text-gray-400">{tenant.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
