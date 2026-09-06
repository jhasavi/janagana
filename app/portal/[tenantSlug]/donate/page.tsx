import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, HeartHandshake } from "lucide-react";
import { CoverProcessingFeeField } from "@/components/portal/cover-processing-fee-field";
import { RecurringDonationField } from "@/components/portal/recurring-billing-fields";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid, Input, Textarea } from "@/components/ui/input";
import {
  DONATION_PRESET_CENTS,
  getPublicDonationContext,
} from "@/lib/actions/public-donations";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import {
  defaultVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";
import { readUtmParams, UTM_FORM_FIELDS } from "@/lib/portal/utm";
import { formatCents } from "@/lib/utils";

const RETURN_TO_FIELD = "returnTo";

function statusMessage(status?: string, error?: string) {
  if (error) return error;
  if (status === "thankyou") {
    return "Thank you for your gift. Your donation is being confirmed — a receipt will be recorded for the organizer.";
  }
  if (status === "canceled") return "Checkout was canceled. You can try again anytime.";
  return null;
}

export default async function PublicDonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    returnTo?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const ctx = await getPublicDonationContext(tenantSlug);

  if (!ctx.ok || !ctx.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  const safeReturnTo = readSafeReturnUrl(query.returnTo);
  const utm = readUtmParams(query);
  const backUrl = safeReturnTo ?? defaultVisitorReturnUrl(tenantSlug);
  const message = statusMessage(query.status, query.error);

  return (
    <PortalFlowLayout
      icon={<HeartHandshake className="h-5 w-5" />}
      eyebrow="Support"
      title={`Donate to ${ctx.tenant.name}`}
      description={`Your gift helps this volunteer-run community continue programs, events, and outreach. JanaGana does not charge a platform fee on donations. ${paymentFeeDisclosure()}`}
      backHref={backUrl}
      backLabel="Community website"
    >
      {message && <Alert variant={query.error ? "error" : "success"}>{message}</Alert>}

      {query.status === "thankyou" && backUrl && (
        <p className="mt-3">
          <a
            href={visitorReturnUrlWithStatus(backUrl, "donation", "thankyou")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to community website
          </a>
        </p>
      )}

      {!ctx.stripeEnabled && (
        <Alert variant="warning" className="mt-4">
          Online donations are not open yet. Please contact the organization directly.
        </Alert>
      )}

      {query.status !== "thankyou" && ctx.stripeEnabled && (
        <form action="/api/public/donate" method="post" className="mt-4 space-y-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}
          {utm.utmSource ? <input type="hidden" name={UTM_FORM_FIELDS.source} value={utm.utmSource} /> : null}
          {utm.utmMedium ? <input type="hidden" name={UTM_FORM_FIELDS.medium} value={utm.utmMedium} /> : null}
          {utm.utmCampaign ? <input type="hidden" name={UTM_FORM_FIELDS.campaign} value={utm.utmCampaign} /> : null}

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Gift amount</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DONATION_PRESET_CENTS.map((cents) => (
                <label
                  key={cents}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-input px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                >
                  <input type="radio" name="amountPreset" value={cents} defaultChecked={cents === 5000} className="sr-only" />
                  {formatCents(cents)}
                </label>
              ))}
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-input px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5 sm:col-span-1">
                <input type="radio" name="amountPreset" value="custom" className="sr-only" />
                Other
              </label>
            </div>
            <FormField label="Custom amount (USD)" className="mt-3">
              <Input name="customAmountDollars" type="number" min="1" step="0.01" placeholder="e.g. 75" />
            </FormField>
          </fieldset>

          <FormGrid>
            <FormField label="First name">
              <Input name="firstName" required />
            </FormField>
            <FormField label="Last name">
              <Input name="lastName" required />
            </FormField>
          </FormGrid>

          <FormField label="Email">
            <Input type="email" name="email" required />
          </FormField>

          <FormField label="Phone (optional)">
            <Input name="phone" type="tel" />
          </FormField>

          <FormField label="Dedication or note (optional)">
            <Textarea name="dedication" rows={3} />
          </FormField>

          <CoverProcessingFeeField baseCents={5000} />
          <RecurringDonationField />

          <Button type="submit">
            Continue to secure checkout
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}

      <p className="mt-6 text-xs text-muted-foreground">No login required — this page is public for donors and visitors.</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Portal URL for your website:{" "}
        <Link href={`/portal/${tenantSlug}/donate`} className="font-mono text-primary hover:text-foreground">
          /portal/{tenantSlug}/donate
        </Link>
      </p>
    </PortalFlowLayout>
  );
}
