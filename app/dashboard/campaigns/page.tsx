import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, TrendingUp, Users } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input, Textarea } from "@/components/ui/input";
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
import { createCampaign, listCampaigns, updateCampaignStatus } from "@/lib/actions/campaigns";
import { publicPortalUrl } from "@/lib/environment";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatMoneyCents } from "@/lib/utils";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  async function createCampaignAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const goalDollarsRaw = String(formData.get("goalDollars") ?? "").trim();

    const result = await createCampaign(
      {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        goalDollars: goalDollarsRaw ? Number(goalDollarsRaw) : undefined,
        status: formData.get("publishNow") === "1" ? "PUBLISHED" : "DRAFT",
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create campaign";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/campaigns?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/campaigns?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/campaigns?success=created");
  }

  async function toggleStatusAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const campaignId = String(formData.get("campaignId") ?? "");
    const status = String(formData.get("status") ?? "") as "DRAFT" | "PUBLISHED" | "ARCHIVED";

    await updateCampaignStatus({ campaignId, status }, { tenantIdHint: tenantHint });

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/campaigns?success=updated");
    }
    redirect("/dashboard/campaigns?success=updated");
  }

  const campaignsResult = await listCampaigns();
  const campaigns = campaignsResult.ok ? campaignsResult.data : [];

  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raisedCents, 0);
  const publishedCount = campaigns.filter((campaign) => campaign.status === "PUBLISHED").length;
  const totalFundraisers = campaigns.reduce((sum, campaign) => sum + campaign.fundraiserCount, 0);

  const portalBaseUrl = tenant ? publicPortalUrl(tenant.slug) : null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Campaigns"
        description="Fundraising campaigns with a goal. Publish one and supporters can donate directly or start their own peer-to-peer fundraising page for it — a Zeffy-style feature, at 0% platform fee."
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "created" && <Alert variant="success">Campaign created.</Alert>}
      {params.success === "updated" && <Alert variant="success">Campaign updated.</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={HeartHandshake} tone="primary" label="Published campaigns" value={String(publishedCount)} />
        <StatCard icon={TrendingUp} tone="success" label="Total raised" value={formatMoneyCents(totalRaised)} />
        <StatCard icon={Users} tone="accent" label="Supporter fundraising pages" value={String(totalFundraisers)} />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Create campaign</h2>
          <form action={createCampaignAction} className="mt-4 grid gap-4 md:grid-cols-2">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Title">
              <Input name="title" required placeholder="e.g. Winter Relief Fund" />
            </FormField>
            <FormField label="Goal in USD (optional)">
              <Input name="goalDollars" type="number" min="1" step="1" placeholder="e.g. 10000" />
            </FormField>
            <FormField label="Description (optional)" className="md:col-span-2">
              <Textarea name="description" rows={3} />
            </FormField>
            <div className="flex items-center gap-3 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input type="checkbox" name="publishNow" value="1" className="h-4 w-4 rounded border-input" />
                Publish immediately
              </label>
              <Button type="submit">Create campaign</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {campaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Create one above. Once published, it's donatable at /portal/{tenant}/campaigns and supporters can start their own fundraising page for it."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Campaign</DataTableHeaderCell>
                <DataTableHeaderCell>Raised</DataTableHeaderCell>
                <DataTableHeaderCell>Fundraisers</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {campaigns.map((campaign) => (
                  <DataTableRow key={campaign.id}>
                    <DataTableCell className="whitespace-nowrap font-medium">
                      <Link
                        href={`/portal/${tenant?.slug}/campaigns/${campaign.slug}`}
                        className="font-bold text-foreground hover:text-primary"
                      >
                        {campaign.title}
                      </Link>
                      {campaign.goalCents ? (
                        <span className="ml-2 text-xs text-muted-foreground">goal {formatMoneyCents(campaign.goalCents)}</span>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell>{formatMoneyCents(campaign.raisedCents)}</DataTableCell>
                    <DataTableCell>{campaign.fundraiserCount}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={campaign.status === "PUBLISHED" ? "brand" : "default"}>{campaign.status}</Badge>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {portalBaseUrl && campaign.status === "PUBLISHED" && (
                          <CopyTextButton text={`${portalBaseUrl}/campaigns/${campaign.slug}`} label="Copy link" />
                        )}
                        {campaign.status !== "PUBLISHED" && (
                          <form action={toggleStatusAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <input type="hidden" name="status" value="PUBLISHED" />
                            <Button type="submit" variant="secondary" size="sm">
                              Publish
                            </Button>
                          </form>
                        )}
                        {campaign.status !== "ARCHIVED" && (
                          <form action={toggleStatusAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <input type="hidden" name="status" value="ARCHIVED" />
                            <Button type="submit" variant="secondary" size="sm">
                              Archive
                            </Button>
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
