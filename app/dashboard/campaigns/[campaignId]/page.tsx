import { notFound, redirect } from "next/navigation";
import { HeartHandshake, TrendingUp, Trophy, Users } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getCampaignDetail, updateCampaignStatus } from "@/lib/actions/campaigns";
import { publicPortalUrl } from "@/lib/environment";
import { portalEmbedUrl } from "@/lib/pilot/tenant-integration";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatDate, formatMoneyCents } from "@/lib/utils";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { campaignId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  const detailResult = await getCampaignDetail(campaignId);
  if (!detailResult.ok || !detailResult.data) {
    notFound();
  }
  const campaign = detailResult.data;

  async function toggleStatusAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const status = String(formData.get("status") ?? "") as "DRAFT" | "PUBLISHED" | "ARCHIVED";

    await updateCampaignStatus({ campaignId, status }, { tenantIdHint: tenantHint });

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `/dashboard/campaigns/${campaignId}?success=updated`);
    }
    redirect(`/dashboard/campaigns/${campaignId}?success=updated`);
  }

  const pct = campaign.goalCents ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100)) : null;
  const publicUrl = tenant ? `${publicPortalUrl(tenant.slug)}/campaigns/${campaign.slug}` : null;
  const embedUrl = tenant ? portalEmbedUrl(`/portal/${tenant.slug}/campaigns/${campaign.slug}`) : null;
  const activeFundraiserCount = campaign.fundraisers.filter((f) => f.active).length;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Campaigns"
        title={campaign.title}
        description={campaign.description ?? undefined}
        actions={
          <>
            {campaign.donations.length > 0 && (
              <a
                href={`/api/export/campaigns/${campaign.id}/donations`}
                className="inline-flex h-8 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/60"
              >
                Export donations CSV
              </a>
            )}
            <ButtonLink href="/dashboard/campaigns" variant="secondary" size="sm">
              Back to campaigns
            </ButtonLink>
          </>
        }
      />

      {query.error && <Alert variant="error">{query.error}</Alert>}
      {query.success === "updated" && <Alert variant="success">Campaign updated.</Alert>}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={TrendingUp} tone="success" label="Total raised" value={formatMoneyCents(campaign.raisedCents)} />
        <StatCard icon={HeartHandshake} tone="primary" label="Direct to campaign" value={formatMoneyCents(campaign.directRaisedCents)} />
        <StatCard icon={Trophy} tone="accent" label="Via fundraising pages" value={formatMoneyCents(campaign.raisedCents - campaign.directRaisedCents)} />
        <StatCard icon={Users} tone="accent" label="Active fundraisers" value={String(activeFundraiserCount)} />
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant={campaign.status === "PUBLISHED" ? "brand" : "default"}>{campaign.status}</Badge>
              </p>
              {campaign.goalCents && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoneyCents(campaign.raisedCents)} of {formatMoneyCents(campaign.goalCents)} goal · {pct}%
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {campaign.status !== "PUBLISHED" && (
                <form action={toggleStatusAction}>
                  {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                  <input type="hidden" name="status" value="PUBLISHED" />
                  <Button type="submit" variant="secondary" size="sm">
                    Publish
                  </Button>
                </form>
              )}
              {campaign.status !== "ARCHIVED" && (
                <form action={toggleStatusAction}>
                  {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                  <input type="hidden" name="status" value="ARCHIVED" />
                  <Button type="submit" variant="secondary" size="sm">
                    Archive
                  </Button>
                </form>
              )}
            </div>
          </div>

          {publicUrl && campaign.status === "PUBLISHED" && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <code className="text-sm text-foreground">{publicUrl}</code>
              <CopyTextButton text={publicUrl} label="Copy public link" />
              {embedUrl && <CopyTextButton text={embedUrl} label="Copy embed link" />}
            </div>
          )}
          {campaign.goalCents && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold text-foreground">Fundraiser leaderboard</h2>
          {campaign.fundraisers.length === 0 ? (
            <EmptyState
              title="No fundraising pages yet"
              description="Once this campaign is published, supporters can start their own page for it from the portal."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Rank</DataTableHeaderCell>
                <DataTableHeaderCell>Fundraiser</DataTableHeaderCell>
                <DataTableHeaderCell>Owner</DataTableHeaderCell>
                <DataTableHeaderCell>Raised</DataTableHeaderCell>
                <DataTableHeaderCell>Goal</DataTableHeaderCell>
                <DataTableHeaderCell>Started</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Link</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {campaign.fundraisers.map((fundraiser, index) => {
                  const fundraiserUrl = tenant ? `${publicPortalUrl(tenant.slug)}/fundraise/${fundraiser.slug}` : null;
                  return (
                    <DataTableRow key={fundraiser.id}>
                      <DataTableCell className="font-bold text-muted-foreground">
                        {index === 0 && fundraiser.raisedCents > 0 ? "🏆 " : ""}
                        {index + 1}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <a
                          href={`/dashboard/members/${fundraiser.ownerContactId}`}
                          className="font-bold text-foreground hover:text-primary"
                        >
                          {fundraiser.title || `${fundraiser.owner.firstName} ${fundraiser.owner.lastName}`}
                        </a>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        {fundraiser.owner.firstName} {fundraiser.owner.lastName}
                        <span className="ml-2 text-xs">{fundraiser.owner.email}</span>
                      </DataTableCell>
                      <DataTableCell className="font-semibold text-foreground">
                        {formatMoneyCents(fundraiser.raisedCents)}
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        {fundraiser.goalCents ? formatMoneyCents(fundraiser.goalCents) : "—"}
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{formatDate(fundraiser.createdAt)}</DataTableCell>
                      <DataTableCell>
                        <Badge variant={fundraiser.active ? "brand" : "default"}>{fundraiser.active ? "Active" : "Inactive"}</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right">
                        {fundraiserUrl && <CopyTextButton text={fundraiserUrl} label="Copy link" />}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold text-foreground">Donations</h2>
          {campaign.donations.length === 0 ? (
            <EmptyState
              title="No donations yet"
              description="Donations, direct or via a fundraiser, will show up here as they come in."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Donor</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Via</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {campaign.donations.map((donation) => (
                  <DataTableRow key={donation.id}>
                    <DataTableCell className="text-muted-foreground">
                      {donation.paidAt ? formatDate(donation.paidAt) : formatDate(donation.createdAt)}
                    </DataTableCell>
                    <DataTableCell className="font-medium">
                      {donation.contact ? (
                        <a href={`/dashboard/members/${donation.contact.id}`} className="text-foreground hover:text-primary">
                          {donation.contact.firstName} {donation.contact.lastName}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="font-semibold text-foreground">
                      {formatMoneyCents(donation.amountCents)}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {donation.peerFundraiser
                        ? `Fundraiser: ${donation.peerFundraiser.title || donation.peerFundraiser.slug}`
                        : "Direct to campaign"}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={donation.status === "PAID" ? "success" : donation.status === "PENDING" ? "warning" : "default"}>
                        {donation.status}
                      </Badge>
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
