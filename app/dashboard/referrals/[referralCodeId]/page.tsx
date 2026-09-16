import { notFound, redirect } from "next/navigation";
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
import { archiveReferralCode, getReferralCodeDetail } from "@/lib/actions/referrals";
import { publicPortalUrl } from "@/lib/environment";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function ReferralCodeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ referralCodeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { referralCodeId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  const detailResult = await getReferralCodeDetail(referralCodeId);
  if (!detailResult.ok || !detailResult.data) {
    notFound();
  }
  const referralCode = detailResult.data;

  async function archiveAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    await archiveReferralCode({ referralCodeId }, { tenantIdHint: tenantHint });

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `/dashboard/referrals/${referralCodeId}?success=archived`);
    }
    redirect(`/dashboard/referrals/${referralCodeId}`);
  }

  const joinLink = tenant ? `${publicPortalUrl(tenant.slug)}/join?ref=${referralCode.code}` : null;
  const conversionRate =
    referralCode.redemptionCount > 0
      ? Math.round((referralCode.convertedCount / referralCode.redemptionCount) * 100)
      : 0;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Referrals"
        title={referralCode.code}
        description={referralCode.label ?? "Ambassador referral link"}
        actions={<ButtonLink href="/dashboard/referrals" variant="secondary" size="sm">Back to referrals</ButtonLink>}
      />

      {query.error && <Alert variant="error">{query.error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard tone="primary" label="Redemptions" value={String(referralCode.redemptionCount)} />
        <StatCard tone="success" label="Converted" value={String(referralCode.convertedCount)} />
        <StatCard tone="accent" label="Conversion rate" value={`${conversionRate}%`} />
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Owner: {referralCode.owner ? `${referralCode.owner.firstName} ${referralCode.owner.lastName} (${referralCode.owner.email})` : "Unassigned"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Status: <Badge variant={referralCode.active ? "brand" : "default"}>{referralCode.active ? "Active" : "Archived"}</Badge>
              </p>
            </div>
            {referralCode.active && (
              <form action={archiveAction}>
                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                <Button type="submit" variant="secondary" size="sm">
                  Archive code
                </Button>
              </form>
            )}
          </div>

          {joinLink && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <code className="text-sm text-foreground">{joinLink}</code>
              <CopyTextButton text={joinLink} label="Copy link" />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold text-foreground">Redemptions</h2>
          {referralCode.redemptions.length === 0 ? (
            <EmptyState title="No redemptions yet" description="Share the link above to start tracking signups." />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Contact</DataTableHeaderCell>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell>Redeemed</DataTableHeaderCell>
                <DataTableHeaderCell>Converted</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {referralCode.redemptions.map((redemption) => (
                  <DataTableRow key={redemption.id}>
                    <DataTableCell className="font-medium">
                      <a
                        href={`/dashboard/members/${redemption.contact.id}`}
                        className="text-foreground hover:text-primary"
                      >
                        {redemption.contact.firstName} {redemption.contact.lastName}
                      </a>
                      <span className="ml-2 text-xs text-muted-foreground">{redemption.contact.email}</span>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{redemption.contact.type}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{formatDate(redemption.createdAt)}</DataTableCell>
                    <DataTableCell>
                      {redemption.converted ? (
                        <Badge variant="success">
                          {redemption.convertedAt ? formatDate(redemption.convertedAt) : "Yes"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
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
