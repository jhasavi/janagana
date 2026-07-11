import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays, PencilLine, Users } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormGrid, Input, Select, Textarea } from "@/components/ui/input";
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
import { createEvent, listEvents } from "@/lib/actions/events";
import { publicPortalUrl } from "@/lib/environment";
import { communityLabel, publicRegisterUrl } from "@/lib/pilot/tenants";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate } from "@/lib/utils";

function eventStatusLabel(status: string): string {
  if (status === "PUBLISHED") return "Published";
  if (status === "DRAFT") return "Draft";
  return status;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const portalUrl = tenant ? publicPortalUrl(tenant.slug) : null;
  const eventsUrl = portalUrl ? `${portalUrl}/events` : null;

  async function createEventAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
    const startsAt = startsAtRaw.length > 0 ? new Date(startsAtRaw) : new Date(NaN);

    const priceDollars = Number(String(formData.get("priceDollars") ?? "0"));
    const priceCents = Number.isFinite(priceDollars) ? Math.round(priceDollars * 100) : NaN;
    const memberPriceRaw = String(formData.get("memberPriceDollars") ?? "").trim();
    const memberPriceDollars = memberPriceRaw ? Number(memberPriceRaw) : undefined;
    const memberPriceCents =
      memberPriceDollars === undefined || !Number.isFinite(memberPriceDollars)
        ? undefined
        : Math.round(memberPriceDollars * 100);

    const capacityRaw = String(formData.get("capacity") ?? "").trim();
    const capacity = capacityRaw.length > 0 ? Number(capacityRaw) : undefined;

    const result = await createEvent(
      {
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        startsAt,
        location: String(formData.get("location") ?? ""),
        status: String(formData.get("status") ?? "DRAFT"),
        priceCents,
        memberPriceCents,
        capacity,
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create event";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/events?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/events?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/events?success=created");
  }

  const eventsResult = await listEvents();
  const events = eventsResult.ok ? eventsResult.data : [];
  const published = events.filter((e) => e.status === "PUBLISHED");
  const drafts = events.filter((e) => e.status !== "PUBLISHED");

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Events"
        description="Only published events appear on your member portal. Share registration links on your website or email."
        actions={
          eventsUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href={eventsUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:text-foreground break-all">
                {eventsUrl}
              </a>
              <CopyTextButton text={eventsUrl} label="Copy events page" />
            </div>
          ) : undefined
        }
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "created" && (
        <Alert variant="success">Event saved. If status is Published, it is live on the portal now.</Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} tone="success" label="Published" value={String(published.length)} />
        <StatCard icon={PencilLine} tone="warning" label="Drafts" value={String(drafts.length)} />
        <StatCard
          icon={Users}
          tone="primary"
          label="Total registrations"
          value={String(events.reduce((sum, event) => sum + event.registrationSummary.confirmed, 0))}
        />
        <StatCard icon={CalendarDays} tone="accent" label="Total events" value={String(events.length)} />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Create event</h2>
          <form action={createEventAction} className="mt-4 grid gap-4 md:grid-cols-2">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Title" className="md:col-span-2">
              <Input name="title" required placeholder="Spring community workshop" />
            </FormField>
            <FormField label="URL slug">
              <Input name="slug" placeholder="spring-workshop" />
            </FormField>
            <FormField label="Location">
              <Input name="location" placeholder="Community center" />
            </FormField>
            <FormField label="Description" className="md:col-span-2">
              <Textarea name="description" rows={2} placeholder="What attendees should know" />
            </FormField>
            <FormField label="Start date & time">
              <Input name="startsAt" required type="datetime-local" />
            </FormField>
            <FormField label="Status">
              <Select name="status" defaultValue="PUBLISHED">
                <option value="PUBLISHED">Published — live on portal</option>
                <option value="DRAFT">Draft — hidden from visitors</option>
              </Select>
            </FormField>
            <FormField label="Price (USD)">
              <Input name="priceDollars" type="number" min="0" step="0.01" defaultValue="0" />
            </FormField>
            <FormField label="Member price (optional)">
              <Input name="memberPriceDollars" type="number" min="0" step="0.01" />
            </FormField>
            <FormField label="Capacity (optional)">
              <Input name="capacity" type="number" min="1" />
            </FormField>
            <div className="md:col-span-2">
              <Button type="submit">Save event</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {events.length === 0 ? (
            <EmptyState
              title={`No events for ${tenant ? communityLabel(tenant.slug) : "this community"} yet`}
              description="Create an event above with status Published, then share the registration link."
            />
          ) : tenant ? (
            <div className="space-y-8">
              {published.length > 0 && (
                <EventTable title="Published events" events={published} tenantSlug={tenant.slug} showRegisterLink />
              )}
              {drafts.length > 0 && (
                <EventTable title="Drafts" events={drafts} tenantSlug={tenant.slug} showRegisterLink={false} />
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </section>
  );
}

function EventTable({
  title,
  events,
  tenantSlug,
  showRegisterLink,
}: {
  title: string;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    status: string;
    priceCents: number;
    ticketTypes: Array<{ name: string; priceCents: number; memberPriceCents: number | null; active: boolean }>;
    registrationSummary: { confirmed: number; active: number; total: number };
  }>;
  tenantSlug: string;
  showRegisterLink: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <DataTable className="mt-3">
        <DataTableHead>
          <DataTableHeaderCell>Event</DataTableHeaderCell>
          <DataTableHeaderCell>When</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell>Registrations</DataTableHeaderCell>
          {showRegisterLink && <DataTableHeaderCell>Register link</DataTableHeaderCell>}
        </DataTableHead>
        <DataTableBody>
          {events.map((event) => {
            const registerUrl = publicRegisterUrl(tenantSlug, event.slug);
            return (
              <DataTableRow key={event.id}>
                <DataTableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-bold text-foreground">{event.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">{event.slug}</span>
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">{formatDate(event.startsAt)}</DataTableCell>
                <DataTableCell>
                  <Badge variant={event.status === "PUBLISHED" ? "success" : "warning"}>
                    {eventStatusLabel(event.status)}
                  </Badge>
                </DataTableCell>
                <DataTableCell>
                  <Link href={`/dashboard/events/${event.id}/registrations`} className="font-semibold text-primary hover:text-foreground">
                    {event.registrationSummary.confirmed} confirmed
                  </Link>
                </DataTableCell>
                {showRegisterLink && (
                  <DataTableCell>
                    <p className="break-all font-mono text-xs text-muted-foreground">{registerUrl}</p>
                    <CopyTextButton text={registerUrl} label="Copy link" className="mt-1" />
                  </DataTableCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
