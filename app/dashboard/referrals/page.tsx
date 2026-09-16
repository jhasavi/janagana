import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, TrendingUp, Users } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input } from "@/components/ui/input";
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
import { archiveReferralCode, createReferralCode, listReferralCodes } from "@/lib/actions/referrals";
import { publicPortalUrl } from "@/lib/environment";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  async function createReferralCodeAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);

    const result = await createReferralCode(
      {
        code: String(formData.get("code") ?? ""),
        label: String(formData.get("label") ?? ""),
        ownerEmail: String(formData.get("ownerEmail") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create referral code";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/referrals?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/referrals?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/referrals?success=created");
  }

  async function archiveReferralCodeAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const referralCodeId = String(formData.get("referralCodeId") ?? "");

    await archiveReferralCode({ referralCodeId }, { tenantIdHint: tenantHint });

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/referrals?success=archived");
    }
    redirect("/dashboard/referrals?success=archived");
  }

  const codesResult = await listReferralCodes();
  const codes = codesResult.ok ? codesResult.data : [];

  const totalRedemptions = codes.reduce((sum, code) => sum + code.redemptionCount, 0);
  const totalConverted = codes.reduce((sum, code) => sum + code.convertedCount, 0);
  const activeCount = codes.filter((code) => code.active).length;

  const joinBaseUrl = tenant ? `${publicPortalUrl(tenant.slug)}/join` : null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Referrals"
        description="Give ambassadors a trackable ?ref= link — every signup through it is attributed, and conversions (paid members/donors) are tracked automatically."
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "created" && <Alert variant="success">Referral code created.</Alert>}
      {params.success === "archived" && <Alert variant="success">Referral code archived.</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Gift} tone="primary" label="Active codes" value={String(activeCount)} />
        <StatCard icon={Users} tone="accent" label="Total redemptions" value={String(totalRedemptions)} />
        <StatCard icon={TrendingUp} tone="success" label="Converted to member/donor" value={String(totalConverted)} />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Create referral code</h2>
          <form action={createReferralCodeAction} className="mt-4 grid gap-4 md:grid-cols-3">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="Code">
              <Input name="code" required placeholder="SARAH2026" className="uppercase" />
            </FormField>
            <FormField label="Label (optional)">
              <Input name="label" placeholder="Sarah M. — book club ambassador" />
            </FormField>
            <FormField label="Owner's email (optional)">
              <Input name="ownerEmail" type="email" placeholder="Must already be a contact" />
            </FormField>
            <div className="md:col-span-3">
              <Button type="submit">Create code</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {codes.length === 0 ? (
            <EmptyState
              title="No referral codes yet"
              description="Create one above, then share the join link it generates with an ambassador."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Code</DataTableHeaderCell>
                <DataTableHeaderCell>Owner</DataTableHeaderCell>
                <DataTableHeaderCell>Redemptions</DataTableHeaderCell>
                <DataTableHeaderCell>Converted</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {codes.map((code) => (
                  <DataTableRow key={code.id}>
                    <DataTableCell className="whitespace-nowrap font-medium">
                      <Link href={`/dashboard/referrals/${code.id}`} className="font-bold text-foreground hover:text-primary">
                        {code.code}
                      </Link>
                      {code.label && <span className="ml-2 text-xs text-muted-foreground">{code.label}</span>}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {code.owner ? `${code.owner.firstName} ${code.owner.lastName}` : "—"}
                    </DataTableCell>
                    <DataTableCell>{code.redemptionCount}</DataTableCell>
                    <DataTableCell>
                      {code.convertedCount > 0 ? (
                        <Badge variant="success">{code.convertedCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={code.active ? "brand" : "default"}>{code.active ? "Active" : "Archived"}</Badge>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {joinBaseUrl && (
                          <CopyTextButton text={`${joinBaseUrl}?ref=${code.code}`} label="Copy link" />
                        )}
                        {code.active && (
                          <form action={archiveReferralCodeAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="referralCodeId" value={code.id} />
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
