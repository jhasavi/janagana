import { notFound, redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
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
import {
  createSponsorInvoiceDraft,
  getSponsorDetail,
  sendSponsorInvoice,
  updateSponsor,
  voidSponsorInvoice,
} from "@/lib/actions/sponsors";
import { listEvents } from "@/lib/actions/events";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate } from "@/lib/utils";

function invoiceStatusVariant(status: string): "default" | "warning" | "success" | "danger" {
  if (status === "SENT") return "warning";
  if (status === "PAID") return "success";
  if (status === "VOID") return "danger";
  return "default";
}

function invoiceStatusLabel(status: string): string {
  if (status === "SENT") return "Sent";
  if (status === "PAID") return "Paid";
  if (status === "VOID") return "Void";
  return "Draft";
}

export default async function SponsorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sponsorId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { sponsorId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  const [detailResult, eventsResult] = await Promise.all([getSponsorDetail(sponsorId), listEvents()]);
  if (!detailResult.ok || !detailResult.data) {
    notFound();
  }
  const sponsor = detailResult.data;
  const events = eventsResult.ok ? eventsResult.data : [];

  const basePath = `/dashboard/sponsors/${sponsorId}`;

  async function updateSponsorAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const actionResult = await updateSponsor(
      {
        sponsorId,
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

    if (!actionResult.ok) {
      const errorMessage = "error" in actionResult && actionResult.error ? actionResult.error : "Failed to update sponsor";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${basePath}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`${basePath}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `${basePath}?success=${encodeURIComponent("Sponsor updated")}`);
    }
    redirect(`${basePath}?success=${encodeURIComponent("Sponsor updated")}`);
  }

  async function createInvoiceAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const amountDollars = Number(String(formData.get("amountDollars") ?? "0"));
    const amountCents = Number.isFinite(amountDollars) ? Math.round(amountDollars * 100) : NaN;
    const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

    const actionResult = await createSponsorInvoiceDraft(
      {
        sponsorId,
        description: String(formData.get("description") ?? ""),
        amountCents,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      },
      { tenantIdHint: tenantHint },
    );

    if (!actionResult.ok) {
      const errorMessage = "error" in actionResult && actionResult.error ? actionResult.error : "Failed to draft invoice";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${basePath}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`${basePath}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `${basePath}?success=${encodeURIComponent("Invoice drafted")}`);
    }
    redirect(`${basePath}?success=${encodeURIComponent("Invoice drafted")}`);
  }

  async function sendInvoiceAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const sponsorInvoiceId = String(formData.get("sponsorInvoiceId") ?? "");
    const actionResult = await sendSponsorInvoice({ sponsorInvoiceId }, { tenantIdHint: tenantHint });

    if (!actionResult.ok) {
      const errorMessage = "error" in actionResult && actionResult.error ? actionResult.error : "Failed to send invoice";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${basePath}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`${basePath}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `${basePath}?success=${encodeURIComponent("Invoice sent")}`);
    }
    redirect(`${basePath}?success=${encodeURIComponent("Invoice sent")}`);
  }

  async function voidInvoiceAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const sponsorInvoiceId = String(formData.get("sponsorInvoiceId") ?? "");
    const actionResult = await voidSponsorInvoice({ sponsorInvoiceId }, { tenantIdHint: tenantHint });

    if (!actionResult.ok) {
      const errorMessage = "error" in actionResult && actionResult.error ? actionResult.error : "Failed to void invoice";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${basePath}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`${basePath}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `${basePath}?success=${encodeURIComponent("Invoice voided")}`);
    }
    redirect(`${basePath}?success=${encodeURIComponent("Invoice voided")}`);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title={sponsor.name}
        description={sponsor.tier ?? undefined}
        actions={<ButtonLink href="/dashboard/sponsors" variant="secondary" size="sm">Back to sponsors</ButtonLink>}
      />

      {query.error && <Alert variant="error">{query.error}</Alert>}
      {query.success && <Alert variant="success">{query.success}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard tone="accent" label="Invoiced" value={formatCents(sponsor.invoicedCents)} />
        <StatCard tone="warning" label="Outstanding" value={formatCents(sponsor.outstandingCents)} />
        <StatCard tone="success" label="Collected" value={formatCents(sponsor.collectedCents)} />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Sponsor details</h2>
          <form action={updateSponsorAction} className="mt-4 grid gap-4 md:grid-cols-2">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Sponsor name" className="md:col-span-2">
              <Input name="name" required defaultValue={sponsor.name} />
            </FormField>
            <FormField label="Tier">
              <Input name="tier" defaultValue={sponsor.tier ?? ""} />
            </FormField>
            <FormField label="Linked event">
              <Select name="eventId" defaultValue={sponsor.eventId ?? ""}>
                <option value="">No linked event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Contact name">
              <Input name="contactName" defaultValue={sponsor.contactName ?? ""} />
            </FormField>
            <FormField label="Contact email">
              <Input name="contactEmail" type="email" defaultValue={sponsor.contactEmail ?? ""} />
            </FormField>
            <FormField label="Contact phone">
              <Input name="contactPhone" defaultValue={sponsor.contactPhone ?? ""} />
            </FormField>
            <FormField label="Website">
              <Input name="website" defaultValue={sponsor.website ?? ""} />
            </FormField>
            <FormField label="Notes" className="md:col-span-2">
              <Textarea name="notes" rows={2} defaultValue={sponsor.notes ?? ""} />
            </FormField>
            <div className="md:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Create invoice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts stay here until you send them. Sending pushes the invoice to Stripe, which emails{" "}
            {sponsor.contactEmail || "the sponsor"} a hosted payment link.
          </p>
          <form action={createInvoiceAction} className="mt-4 grid gap-4 md:grid-cols-3">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Description" className="md:col-span-2">
              <Input name="description" required placeholder="2026 Annual Gala — Gold Sponsorship" />
            </FormField>
            <FormField label="Amount (USD)">
              <Input name="amountDollars" type="number" min="1" step="0.01" required />
            </FormField>
            <FormField label="Due date (optional)" className="md:col-span-2">
              <Input name="dueDate" type="date" />
            </FormField>
            <div className="flex items-end">
              <Button type="submit">Save draft</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {sponsor.invoices.length === 0 ? (
            <EmptyState title="No invoices yet" description="Create a draft invoice above to get started." />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Description</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Due</DataTableHeaderCell>
                <DataTableHeaderCell>Actions</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {sponsor.invoices.map((invoice) => (
                  <DataTableRow key={invoice.id}>
                    <DataTableCell className="font-medium text-foreground">{invoice.description}</DataTableCell>
                    <DataTableCell>{formatCents(invoice.amountCents)}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={invoiceStatusVariant(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {invoice.status === "DRAFT" && (
                          <form action={sendInvoiceAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="sponsorInvoiceId" value={invoice.id} />
                            <Button type="submit" size="sm" variant="secondary">Send</Button>
                          </form>
                        )}
                        {invoice.hostedInvoiceUrl && (invoice.status === "SENT" || invoice.status === "PAID") && (
                          <CopyTextButton text={invoice.hostedInvoiceUrl} label="Copy link" />
                        )}
                        {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
                          <form action={voidInvoiceAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="sponsorInvoiceId" value={invoice.id} />
                            <Button type="submit" size="sm" variant="ghost">Void</Button>
                          </form>
                        )}
                      </div>
                    </DataTableCell>
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
