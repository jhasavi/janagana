import Link from "next/link";
import { redirect } from "next/navigation";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getDashboardAccessForTenant } from "@/lib/auth";
import {
  openStripeExpressDashboard,
  refreshStripeConnectStatus,
  startStripeConnectOnboarding,
} from "@/lib/actions/stripe-connect";
import { loadPaymentRoutingForTenant } from "@/lib/payments/connect";
import { adminPaymentRoutingMessage, PAYMENTS_SETTINGS_PATH } from "@/lib/payments/connect-routing";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import { prisma } from "@/lib/prisma";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_COPY = {
  NOT_STARTED: { label: "Not connected", variant: "default" },
  PENDING: { label: "Onboarding in progress", variant: "warning" },
  RESTRICTED: { label: "Stripe needs more information", variant: "warning" },
  ACTIVE: { label: "Connected — receiving payments", variant: "success" },
} as const;

function errorRedirect(tenantHint: string | null | undefined, error: string): never {
  const path = `${PAYMENTS_SETTINGS_PATH}?error=${encodeURIComponent(error)}`;
  if (tenantHint) redirectWithActiveTenant(tenantHint, path);
  redirect(path);
}

export default async function PaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const query = await searchParams;

  const resolution = await resolveTenantForDashboard();
  if (resolution.status !== "ONE_TENANT") redirect("/dashboard/settings");
  const activeTenant = resolution.tenant;
  const access = await getDashboardAccessForTenant(activeTenant);

  // Returning from Stripe: pull fresh status so the page doesn't wait on the webhook.
  let syncError: string | null = null;
  if (query.connect === "return") {
    const sync = await refreshStripeConnectStatus();
    if (!sync.ok) syncError = sync.error;
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: activeTenant.id },
    select: {
      id: true,
      name: true,
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectDetailsSubmitted: true,
      stripeConnectSyncedAt: true,
    },
  });
  const routing = await loadPaymentRoutingForTenant(tenant.id);
  const routingMessage = adminPaymentRoutingMessage(routing);
  const status = STATUS_COPY[tenant.stripeConnectStatus];

  async function startOnboardingAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await startStripeConnectOnboarding({ tenantIdHint: tenantHint });
    if (!result.ok) errorRedirect(tenantHint, result.error);
    redirect(result.url);
  }

  async function openDashboardAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await openStripeExpressDashboard({ tenantIdHint: tenantHint });
    if (!result.ok) errorRedirect(tenantHint, result.error);
    redirect(result.url);
  }

  const startLabel =
    tenant.stripeConnectStatus === "NOT_STARTED"
      ? "Connect with Stripe"
      : tenant.stripeConnectStatus === "ACTIVE"
        ? "Update details in Stripe"
        : "Continue Stripe setup";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Payments"
        description={`Connect ${tenant.name}'s own Stripe account so donations, dues, event tickets, and sponsor invoices are paid out directly to your bank. ${paymentFeeDisclosure()}`}
      />

      <p className="text-sm">
        <Link href="/dashboard/settings" className="font-medium text-primary hover:text-foreground">
          ← Back to settings
        </Link>
      </p>

      {query.error && <Alert variant="error">{query.error}</Alert>}
      {syncError && <Alert variant="error">Could not refresh status from Stripe: {syncError}</Alert>}
      {query.connect === "refresh" && (
        <Alert variant="warning">That Stripe setup link expired. Click below to pick up where you left off.</Alert>
      )}
      {routingMessage && <Alert variant={routing.mode === "blocked" ? "error" : "warning"}>{routingMessage}</Alert>}

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Stripe account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Setup takes about 5 minutes on Stripe&apos;s secure site: organization details, a representative, and
                the bank account for payouts. JanaGana never sees your bank details.
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Accepting payments</dt>
              <dd className="font-medium text-foreground">{tenant.stripeConnectChargesEnabled ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payouts to bank</dt>
              <dd className="font-medium text-foreground">{tenant.stripeConnectPayoutsEnabled ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last checked</dt>
              <dd className="font-medium text-foreground">
                {tenant.stripeConnectSyncedAt ? formatRelativeTime(tenant.stripeConnectSyncedAt) : "Never"}
              </dd>
            </div>
          </dl>

          {access.canWrite ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <form action={startOnboardingAction}>
                <TenantScopeHiddenFields tenantId={tenant.id} />
                <Button type="submit">{startLabel}</Button>
              </form>
              {tenant.stripeConnectDetailsSubmitted && (
                <form action={openDashboardAction}>
                  <TenantScopeHiddenFields tenantId={tenant.id} />
                  <Button type="submit" variant="secondary">
                    Open Stripe payouts dashboard
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Ask an org admin to connect Stripe.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">How JanaGana stays free</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            JanaGana takes no platform fee from your organization. At checkout, donors and members may add an optional
            tip to support JanaGana; it is shown as its own line and never reduces what you receive. Standard card
            processing (about 2.9% + 30¢) is deducted from each payment unless the donor chooses to cover it.
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
