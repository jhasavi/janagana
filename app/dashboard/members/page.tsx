import { redirect } from "next/navigation";
import Link from "next/link";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { ContactsTable } from "@/components/dashboard/contacts-table";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { createContact, deleteContact, listContacts, updateContact } from "@/lib/actions/contacts";
import {
  contactInterestLabel,
  contactSourceLabel,
  PILOT_INTEREST_FILTERS,
} from "@/lib/pilot/contact-labels";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard, tenantIdFromMutation } from "@/lib/tenant";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";

function filterHref(base: string, params: Record<string, string>) {
  const url = new URL(base, "http://local");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}`;
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
  const summary = tenant ? await getTenantDashboardSummary(tenant.id) : null;
  const filters = {
    q: params.q ?? "",
    // Legacy import redirects used ?source= — do not auto-filter 200+ rows on success page load.
    source: params.success === "import" ? "" : (params.source ?? ""),
    interestType: params.interestType ?? "",
  };

  async function createContactAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await createContact(
      {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: "OTHER",
        notes: String(formData.get("notes") ?? ""),
        tags: String(formData.get("tags") ?? ""),
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create contact";
      const tenantId = tenantIdFromMutation(tenantHint);
      if (tenantId) {
        redirectWithActiveTenant(tenantId, `/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/members?success=1");
  }

  async function updateContactAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await updateContact(
      {
        contactId: String(formData.get("contactId") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: String(formData.get("type") ?? "OTHER"),
        notes: String(formData.get("notes") ?? ""),
        tags: String(formData.get("tags") ?? ""),
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to update contact";
      const tenantId = tenantIdFromMutation(tenantHint);
      if (tenantId) {
        redirectWithActiveTenant(tenantId, `/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/members?success=updated");
  }

  async function deleteContactAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const contactId = String(formData.get("contactId") ?? "").trim();
    const result = await deleteContact(contactId, { tenantIdHint: tenantHint });

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to delete contact";
      const tenantId = tenantIdFromMutation(tenantHint);
      if (tenantId) {
        redirectWithActiveTenant(tenantId, `/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/members?success=deleted");
    }
    redirect("/dashboard/members?success=deleted");
  }

  const contactsResult = await listContacts(filters);
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

  return (
    <section className="space-y-4">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Contacts & leads</h1>
            <a
              href="/api/export/contacts"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Export CSV
            </a>
            <Link
              href="/dashboard/members/import"
              className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-100"
            >
              Import spreadsheet
            </Link>
          </div>
          {summary && (
            <p className="mt-2 text-sm text-gray-600">
              <strong>{summary.contactsTotal}</strong> people · <strong>{summary.contactsLeads}</strong> portal leads ·{" "}
              <strong>{summary.eventRegistrationsConfirmed}</strong> with event registration
            </p>
          )}
        </div>
      </div>

      {params.error && <p className="text-sm text-red-700">{params.error}</p>}
      {params.success === "1" && <p className="text-sm text-green-700">Contact added manually.</p>}
      {params.success === "updated" && <p className="text-sm text-green-700">Contact updated.</p>}
      {params.success === "deleted" && <p className="text-sm text-green-700">Contact removed.</p>}
      {params.success === "import" && (
        <p className="text-sm text-green-700">
          Import complete — {params.importCreated ?? "0"} created, {params.importUpdated ?? "0"} updated,{" "}
          {params.importSkipped ?? "0"} skipped (no email).{" "}
          <Link
            href={filterHref(basePath, {
              ...filters,
              source: importSourceFilter || "dashboard_csv_import",
            })}
            className="font-semibold underline"
          >
            View imported contacts
          </Link>
          .
        </p>
      )}
      {params.importErrors && (
        <p className="text-sm text-amber-900 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          Row warnings: {params.importErrors}
        </p>
      )}

      {contactsTruncated && (
        <p className="text-sm text-slate-700 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          Showing first {contacts.length} of {contactsTotal} contacts matching these filters. Narrow with search or
          channel filter.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-gray-500 py-1">Quick filters:</span>
        <Link
          href={basePath}
          className={`rounded-full px-2.5 py-1 text-xs ${!filters.interestType && !filters.source ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          All
        </Link>
        {PILOT_INTEREST_FILTERS.map((preset) => (
          <Link
            key={preset.value}
            href={filterHref(basePath, { ...filters, interestType: preset.value })}
            className={`rounded-full px-2.5 py-1 text-xs ${
              filters.interestType === preset.value
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {preset.label}
          </Link>
        ))}
        <Link
          href={filterHref(basePath, { ...filters, source: "dashboard_csv_import" })}
          className={`rounded-full px-2.5 py-1 text-xs ${
            filters.source === "dashboard_csv_import"
              ? "bg-teal-800 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Imported
        </Link>
        <Link
          href={filterHref(basePath, { ...filters, source: "dashboard_raklet_import" })}
          className={`rounded-full px-2.5 py-1 text-xs ${
            filters.source === "dashboard_raklet_import"
              ? "bg-teal-800 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Raklet import
        </Link>
      </div>

      <form
        action={basePath}
        className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-[1fr_160px_180px_auto]"
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, email, phone, notes, tags"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select name="source" defaultValue={filters.source} className="rounded border border-gray-300 px-3 py-2 text-sm">
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
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All intents</option>
          {interestOptions.map((interest) => (
            <option key={interest} value={interest}>
              {contactInterestLabel(interest)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
          Search
        </button>
      </form>

      <details className="rounded-md border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-900">Add manual entry</summary>
        <p className="mt-2 text-xs text-gray-600">For walk-ins or phone calls — not from the public portal.</p>
        <form action={createContactAction} className="mt-4 grid gap-3 md:grid-cols-2">
          {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
          <input name="firstName" required placeholder="First name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input name="lastName" required placeholder="Last name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input
            name="email"
            required
            type="email"
            placeholder="Email"
            className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input name="phone" placeholder="Phone" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input
            name="tags"
            placeholder="Tags (comma-separated, optional)"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            rows={3}
            placeholder="Admin notes (optional)"
            className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="md:col-span-2">
            <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
              Add contact
            </button>
          </div>
        </form>
      </details>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        {contacts.length === 0 ? (
          <div className="space-y-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
            <p className="font-medium text-gray-900">
              {filters.q || filters.source || filters.interestType
                ? "No contacts match these filters"
                : `No contacts for ${tenant?.slug ?? "this tenant"} yet`}
            </p>
            {!filters.q && !filters.source && !filters.interestType && (
              <p>
                <Link href="/dashboard/members/import" className="font-medium text-teal-900 underline">
                  Import a Raklet or Excel export
                </Link>{" "}
                or test your portal contact form from the dashboard home page.
              </p>
            )}
          </div>
        ) : (
          <ContactsTable
            contacts={contacts}
            tenantId={tenant?.id ?? ""}
            tenantSlug={tenant?.slug ?? "—"}
            updateContactAction={updateContactAction}
            deleteContactAction={deleteContactAction}
          />
        )}
      </div>
    </section>
  );
}
