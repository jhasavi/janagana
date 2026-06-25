import { redirect } from "next/navigation";
import Link from "next/link";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { ContactsCrmTable } from "@/components/dashboard/contacts-table";
import { listContacts } from "@/lib/actions/contacts";
import { CONTACT_QUICK_FILTERS } from "@/lib/pilot/contact-filters";
import { contactInterestLabel, contactSourceLabel } from "@/lib/pilot/contact-labels";
import { resolveTenantForDashboard } from "@/lib/tenant";

function filterHref(base: string, params: Record<string, string>) {
  const url = new URL(base, "http://local");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}`;
}

function activeQuickFilter(params: {
  preset?: string;
  source?: string;
  interestType?: string;
  q?: string;
}): string {
  if (params.preset === "members") return "members";
  if (params.preset === "leads") return "leads";
  if (params.preset === "no-email") return "no-email";
  if (params.preset === "recent") return "recent";
  if (params.source === "dashboard_raklet_import") return "raklet";
  if (params.source === "dashboard_csv_import") return "imported";
  if (!params.preset && !params.source && !params.interestType && !params.q) return "all";
  return "";
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    importCreated?: string;
    importUpdated?: string;
    importSkipped?: string;
    importErrors?: string;
    importSource?: string;
    openImport?: string;
    q?: string;
    source?: string;
    interestType?: string;
    preset?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.openImport === "1") {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "openImport" || !value) continue;
      q.set(key, value);
    }
    redirect(`/dashboard/members/import${q.size ? `?${q.toString()}` : ""}`);
  }

  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  const filters = {
    q: params.q ?? "",
    source: params.success === "import" ? "" : (params.source ?? ""),
    interestType: params.interestType ?? "",
    preset: (params.preset ?? "") as "" | "members" | "leads" | "no-email" | "recent",
  };

  let contactsResult;
  try {
    contactsResult = await listContacts(filters);
    console.info("MEMBERS_PAGE_RENDER", {
      tenantId: tenant?.id ?? null,
      success: params.success ?? null,
      filterSource: filters.source || null,
      filterPreset: filters.preset || null,
      rowCount: contactsResult.ok ? contactsResult.data.length : 0,
      totalCount: contactsResult.ok ? contactsResult.totalCount : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown render error";
    console.error("MEMBERS_PAGE_RENDER_FAILED", {
      tenantId: tenant?.id ?? null,
      success: params.success ?? null,
      error: message.slice(0, 200),
    });
    throw error;
  }

  const contacts = contactsResult.ok ? contactsResult.data : [];
  const contactsTotal = contactsResult.ok ? contactsResult.totalCount : 0;
  const contactsTruncated = contactsResult.ok ? contactsResult.truncated : false;
  const sourceOptions = contactsResult.ok ? contactsResult.sourceOptions : [];
  const interestOptions = contactsResult.ok ? contactsResult.interestOptions : [];

  const basePath = "/dashboard/members";
  const importSourceFilter =
    params.importSource ??
    (params.success === "import" ? params.source : undefined) ??
    "dashboard_csv_import";
  const quickActive = activeQuickFilter({
    preset: filters.preset,
    source: params.source,
    interestType: filters.interestType,
    q: filters.q,
  });

  return (
    <section className="space-y-3">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Contacts</h1>
          <p className="text-sm text-slate-600">
            {contactsTotal} contact{contactsTotal === 1 ? "" : "s"}
            {contactsTruncated ? ` · showing ${contacts.length}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/members/import"
            className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-100"
          >
            Import
          </Link>
          <a
            href="/api/export/contacts"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-stone-50"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard/members/new"
            className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
          >
            Add contact
          </Link>
        </div>
      </div>

      {params.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{params.error}</p>
      )}
      {params.success === "1" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Contact added.
        </p>
      )}
      {params.success === "updated" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Contact updated.
        </p>
      )}
      {params.success === "deleted" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Contact removed.
        </p>
      )}
      {params.success === "import" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Import complete — {params.importCreated ?? "0"} created, {params.importUpdated ?? "0"} updated,{" "}
          {params.importSkipped ?? "0"} skipped (no email).{" "}
          <Link
            href={filterHref(basePath, { source: importSourceFilter })}
            className="font-semibold underline"
          >
            View imported contacts
          </Link>
        </p>
      )}
      {params.importErrors && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Row warnings: {params.importErrors}
        </p>
      )}
      {contactsTruncated && (
        <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-slate-700">
          Showing first {contacts.length} of {contactsTotal} matching contacts. Use search or filters to narrow results.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {CONTACT_QUICK_FILTERS.map((chip) => (
          <Link
            key={chip.id}
            href={chip.href(basePath)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              quickActive === chip.id
                ? "bg-slate-900 text-white"
                : "bg-stone-100 text-slate-700 hover:bg-stone-200"
            }`}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      <form
        action={basePath}
        className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-3 sm:flex-row sm:items-center"
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, email, phone, tags"
          className="min-w-0 flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm"
        />
        <select
          name="source"
          defaultValue={filters.source}
          className="rounded border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="">All channels</option>
          {sourceOptions.map((source) => (
            <option key={source} value={source}>
              {contactSourceLabel(source)}
            </option>
          ))}
        </select>
        <select
          name="interestType"
          defaultValue={filters.interestType}
          className="rounded border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="">All intents</option>
          {interestOptions.map((interest) => (
            <option key={interest} value={interest}>
              {contactInterestLabel(interest)}
            </option>
          ))}
        </select>
        {filters.preset && <input type="hidden" name="preset" value={filters.preset} />}
        <button type="submit" className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-teal-900">
          Search
        </button>
      </form>

      <div className="rounded-md border border-stone-200 bg-white">
        {contacts.length === 0 ? (
          <div className="space-y-2 p-8 text-center text-sm text-slate-600">
            <p className="font-medium text-slate-900">
              {filters.q || filters.source || filters.interestType || filters.preset
                ? "No contacts match these filters"
                : `No contacts for ${tenant?.slug ?? "this tenant"} yet`}
            </p>
            {!filters.q && !filters.source && !filters.interestType && !filters.preset && (
              <p>
                <Link href="/dashboard/members/import" className="font-semibold text-teal-900 underline">
                  Import a spreadsheet
                </Link>{" "}
                to get started.
              </p>
            )}
          </div>
        ) : (
          <ContactsCrmTable contacts={contacts} />
        )}
      </div>
    </section>
  );
}
