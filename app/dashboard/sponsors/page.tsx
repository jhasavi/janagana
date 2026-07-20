import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, HandCoins, ReceiptText, Wallet } from "lucide-react";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { createSponsor, listSponsors } from "@/lib/actions/sponsors";
import { listEvents } from "@/lib/actions/events";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents } from "@/lib/utils";

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  async function createSponsorAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);

    const result = await createSponsor(
      {
        name: String(formData.get("name") ?? ""),
        tier: String(formData.get("tier") ?? ""),
        contactName: String(formData.get("contactName") ?? ""),
        contactEmail: String(formData.get("contactEmail") ?? ""),
        contactPhone: String(formData.get("contactPhone") ?? ""),
        website: String(formData.get("website") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        eventId: String(formData.get("eventId") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create sponsor";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/sponsors?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/sponsors?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/sponsors?success=created");
  }

  const [sponsorsResult, eventsResult] = await Promise.all([listSponsors(), listEvents()]);
  const sponsors = sponsorsResult.ok ? sponsorsResult.data : [];
  const events = eventsResult.ok ? eventsResult.data : [];

  const totals = sponsors.reduce(
    (sum, sponsor) => ({
      invoicedCents: sum.invoicedCents + sponsor.invoicedCents,
      outstandingCents: sum.outstandingCents + sponsor.outstandingCents,
      collectedCents: sum.collectedCents + sponsor.collectedCents,
    }),
    { invoicedCents: 0, outstandingCents: 0, collectedCents: 0 },
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Sponsors"
        description="Track event and annual sponsors — pledges, contacts, and invoices — and bill them directly through Stripe."
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "created" && <Alert variant="success">Sponsor added.</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} tone="primary" label="Sponsors" value={String(sponsors.length)} />
        <StatCard icon={ReceiptText} tone="accent" label="Total invoiced" value={formatCents(totals.invoicedCents)} />
        <StatCard icon={HandCoins} tone="warning" label="Outstanding" value={formatCents(totals.outstandingCents)} />
        <StatCard icon={Wallet} tone="success" label="Collected" value={formatCents(totals.collectedCents)} />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Add sponsor</h2>
          <form action={createSponsorAction} className="mt-4 grid gap-4 md:grid-cols-2">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Sponsor name" className="md:col-span-2">
              <Input name="name" required placeholder="Cornerstone Legal Partners" />
            </FormField>
            <FormField label="Tier">
              <Input name="tier" placeholder="Gold" />
            </FormField>
            <FormField label="Linked event (optional)">
              <Select name="eventId" defaultValue="">
                <option value="">No linked event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Contact name">
              <Input name="contactName" placeholder="Alan Whitcomb" />
            </FormField>
            <FormField label="Contact email">
              <Input name="contactEmail" type="email" placeholder="sponsorships@example.com" />
            </FormField>
            <FormField label="Contact phone">
              <Input name="contactPhone" placeholder="(555) 555-0100" />
            </FormField>
            <FormField label="Website">
              <Input name="website" placeholder="https://example.com" />
            </FormField>
            <FormField label="Notes" className="md:col-span-2">
              <Textarea name="notes" rows={2} placeholder="Multi-year gala sponsor" />
            </FormField>
            <div className="md:col-span-2">
              <Button type="submit">Add sponsor</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {sponsors.length === 0 ? (
            <EmptyState
              title="No sponsors yet"
              description="Add a sponsor above, then create and send invoices from their profile."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Sponsor</DataTableHeaderCell>
                <DataTableHeaderCell>Contact</DataTableHeaderCell>
                <DataTableHeaderCell>Linked event</DataTableHeaderCell>
                <DataTableHeaderCell>Invoiced</DataTableHeaderCell>
                <DataTableHeaderCell>Outstanding</DataTableHeaderCell>
                <DataTableHeaderCell>Collected</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {sponsors.map((sponsor) => (
                  <DataTableRow key={sponsor.id}>
                    <DataTableCell>
                      <Link href={`/dashboard/sponsors/${sponsor.id}`} className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block font-bold text-foreground hover:text-primary">{sponsor.name}</span>
                          {sponsor.tier && <Badge variant="brand">{sponsor.tier}</Badge>}
                        </span>
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {sponsor.contactName || sponsor.contactEmail || "—"}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{sponsor.event?.title ?? "—"}</DataTableCell>
                    <DataTableCell>{formatCents(sponsor.invoicedCents)}</DataTableCell>
                    <DataTableCell>
                      {sponsor.outstandingCents > 0 ? (
                        <Badge variant="warning">{formatCents(sponsor.outstandingCents)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>{formatCents(sponsor.collectedCents)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
