import { redirect } from "next/navigation";
import Link from "next/link";
import { ContactsCrmTable } from "@/components/dashboard/contacts-table";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { listContacts } from "@/lib/actions/contacts";
import {
  contactExportHref,
  contactListQueryString,
  hasActiveContactFilters,
} from "@/lib/contacts/list-filters";
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
  tag?: string;
  q?: string;
}): string {
  if (params.preset === "members") return "members";
  if (params.preset === "volunteers") return "volunteers";
  if (params.preset === "donors") return "donors";
  if (params.preset === "leads") return "leads";
  if (params.preset === "no-email") return "no-email";
  if (params.preset === "recent") return "recent";
  if (params.source === "dashboard_raklet_import") return "raklet";
  if (params.source === "dashboard_csv_import") return "imported";
  if (!params.preset && !params.source && !params.interestType && !params.tag && !params.q) return "all";
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
    tag?: string;
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
    tag: params.tag ?? "",
    preset: (params.preset ?? "") as "" | "members" | "volunteers" | "donors" | "leads" | "no-email" | "recent",
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
  const tagOptions = contactsResult.ok ? contactsResult.tagOptions : [];
  const exportHref = contactExportHref(filters);
  const filtersActive = hasActiveContactFilters(filters);

  const basePath = "/dashboard/members";
  const importSourceFilter =
    params.importSource ??
    (params.success === "import" ? params.source : undefined) ??
    "dashboard_csv_import";
  const quickActive = activeQuickFilter({
    preset: filters.preset,
    source: params.source,
    interestType: filters.interestType,
    tag: filters.tag,
    q: filters.q,
  });

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Contacts"
        description={`${contactsTotal} contact${contactsTotal === 1 ? "" : "s"}${contactsTruncated ? ` · showing ${contacts.length}` : ""}`}
        actions={
          <>
            <ButtonLink href="/dashboard/members/import" variant="secondary" size="sm">
              Import
            </ButtonLink>
            <a
              href={exportHref}
              className="inline-flex h-8 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/60"
            >
              Export CSV
            </a>
            <ButtonLink href="/dashboard/members/new" size="sm">
              Add contact
            </ButtonLink>
          </>
        }
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "1" && <Alert variant="success">Contact added.</Alert>}
      {params.success === "updated" && <Alert variant="success">Contact updated.</Alert>}
      {params.success === "deleted" && <Alert variant="success">Contact removed.</Alert>}
      {params.success === "import" && (
        <Alert variant="success">
          Import complete — {params.importCreated ?? "0"} created, {params.importUpdated ?? "0"} updated,{" "}
          {params.importSkipped ?? "0"} skipped (no email).{" "}
          <Link href={filterHref(basePath, { source: importSourceFilter })} className="font-semibold underline">
            View imported contacts
          </Link>
        </Alert>
      )}
      {params.importErrors && <Alert variant="warning">Row warnings: {params.importErrors}</Alert>}
      {contactsTruncated && (
        <Alert variant="info">
          Showing first {contacts.length} of {contactsTotal} matching contacts. Use search or filters to narrow results.
        </Alert>
      )}

      {filtersActive && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">Active filters:</span>
          {filters.q && <span className="text-muted-foreground">Search “{filters.q}”</span>}
          {filters.tag && <span className="text-muted-foreground">Tag “{filters.tag}”</span>}
          {filters.source && <span className="text-muted-foreground">{contactSourceLabel(filters.source)}</span>}
          {filters.interestType && (
            <span className="text-muted-foreground">{contactInterestLabel(filters.interestType)}</span>
          )}
          {filters.preset && <span className="text-muted-foreground">Preset: {filters.preset}</span>}
          <Link href="/dashboard/members" className="ml-auto text-xs font-semibold text-primary hover:text-foreground">
            Clear all
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CONTACT_QUICK_FILTERS.map((chip) => (
          <FilterChip key={chip.id} href={chip.href(basePath)} active={quickActive === chip.id}>
            {chip.label}
          </FilterChip>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-4">
          <form action={basePath} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input name="q" defaultValue={filters.q} placeholder="Search name, email, phone, tags" className="flex-1" />
            <Select name="source" defaultValue={filters.source} className="sm:w-44">
              <option value="">All channels</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {contactSourceLabel(source)}
                </option>
              ))}
            </Select>
            <Select name="interestType" defaultValue={filters.interestType} className="sm:w-44">
              <option value="">All intents</option>
              {interestOptions.map((interest) => (
                <option key={interest} value={interest}>
                  {contactInterestLabel(interest)}
                </option>
              ))}
            </Select>
            <Select name="tag" defaultValue={filters.tag} className="sm:w-44">
              <option value="">All tags</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
            {filters.preset && <input type="hidden" name="preset" value={filters.preset} />}
            <Button type="submit" size="sm">
              Search
            </Button>
            {filtersActive && (
              <ButtonLink href="/dashboard/members" variant="secondary" size="sm">
                Clear
              </ButtonLink>
            )}
          </form>

          {tagOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</span>
              {tagOptions.slice(0, 8).map((tag) => (
                <FilterChip
                  key={tag}
                  href={`/dashboard/members${contactListQueryString({ ...filters, tag })}`}
                  active={filters.tag === tag}
                >
                  {tag}
                </FilterChip>
              ))}
            </div>
          )}

          {contacts.length === 0 ? (
            <EmptyState
              title={
                filters.q || filters.source || filters.interestType || filters.tag || filters.preset
                  ? "No contacts match these filters"
                  : `No contacts for ${tenant?.slug ?? "this community"} yet`
              }
              description={
                !filters.q && !filters.source && !filters.interestType && !filters.tag && !filters.preset
                  ? "Import a spreadsheet or test your portal contact form to capture the first lead."
                  : undefined
              }
              action={
                !filters.q && !filters.source && !filters.interestType && !filters.tag && !filters.preset ? (
                  <ButtonLink href="/dashboard/members/import" size="sm">
                    Import spreadsheet
                  </ButtonLink>
                ) : undefined
              }
            />
          ) : (
            <ContactsCrmTable contacts={contacts} />
          )}
        </CardBody>
      </Card>
    </section>
  );
}
