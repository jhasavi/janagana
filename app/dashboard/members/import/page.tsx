import Link from "next/link";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function ContactImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    importCreated?: string;
    importUpdated?: string;
    importSkipped?: string;
    importErrors?: string;
    importPreview?: string;
  }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  return (
    <section className="space-y-4">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <div>
        <Link href="/dashboard/members" className="text-sm text-teal-900 hover:text-teal-950">
          ← Back to contacts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Import spreadsheet</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Migrate from Raklet, Excel, or Google Sheets. Export your member list, upload here, preview row counts, then
          import. Re-import is safe — we upsert by email per community.
        </p>
      </div>

      {params.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{params.error}</p>
      )}
      {params.importPreview === "1" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Preview only — {params.importCreated ?? "0"} would be created, {params.importUpdated ?? "0"} would be updated,{" "}
          {params.importSkipped ?? "0"} skipped. Click <strong>Import now</strong> to apply.
        </p>
      )}
      {params.importErrors && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Row warnings: {params.importErrors}
        </p>
      )}

      <div className="rounded-md border border-teal-200 bg-teal-50/50 p-4">
        <p className="text-xs text-teal-900">
          Required column: <strong>Email</strong> or <strong>E-mail address</strong> (Raklet export shape). Name and phone
          columns are optional.
        </p>
        <p className="mt-2 text-xs text-teal-800">
          <a href="/templates/contact-import-template.csv" className="underline">
            Download template CSV
          </a>
          {" · "}
          Namaste Boston live CRM sync uses <code className="font-mono">npm run import:nb-crm</code> when connected to
          Supabase.
        </p>
        <form action="/api/import/contacts" method="post" encType="multipart/form-data" className="mt-4 grid gap-3 md:grid-cols-2">
          {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
          <label className="block text-sm md:col-span-2">
            File
            <input
              name="file"
              type="file"
              required
              accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1 block w-full text-sm"
            />
          </label>
          <label className="block text-sm">
            Import type
            <select name="preset" defaultValue="raklet" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="raklet">Raklet export</option>
              <option value="generic">General spreadsheet</option>
              <option value="class_roster">Class roster (TPW-style)</option>
            </select>
          </label>
          <label className="block text-sm">
            Tag (optional)
            <input
              name="importTag"
              placeholder="e.g. raklet-2026"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              name="mode"
              value="preview"
              className="rounded border border-teal-700 bg-white px-4 py-2 text-sm font-medium text-teal-900 hover:bg-teal-50"
            >
              Preview
            </button>
            <button
              type="submit"
              name="mode"
              value="import"
              className="rounded bg-teal-900 px-4 py-2 text-sm font-medium text-white hover:bg-teal-950"
            >
              Import now
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
