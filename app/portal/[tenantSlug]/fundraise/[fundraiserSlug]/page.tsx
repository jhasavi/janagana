import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { CoverProcessingFeeField } from "@/components/portal/cover-processing-fee-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid, Input, Textarea } from "@/components/ui/input";
import { DONATION_PRESET_CENTS } from "@/lib/actions/public-donations";
import { getPublicPeerFundraiser } from "@/lib/actions/peer-fundraisers";
import { publicPortalUrl } from "@/lib/environment";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import { formatMoneyCents } from "@/lib/utils";

interface Props {
  params: Promise<{ tenantSlug: string; fundraiserSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}

function statusMessage(status?: string, error?: string) {
  if (error) return error;
  if (status === "thankyou") {
    return "Thank you for your gift! It's being confirmed and will show up in the total shortly.";
  }
  if (status === "canceled") return "Checkout was canceled. You can try again anytime.";
  return null;
}

export default async function PeerFundraiserPage({ params, searchParams }: Props) {
  const { tenantSlug, fundraiserSlug } = await params;
  const query = await searchParams;
  const result = await getPublicPeerFundraiser(tenantSlug, fundraiserSlug);

  if (!result.ok || !result.data) {
    notFound();
  }

  const fundraiser = result.data;
  const pct = fundraiser.goalCents ? Math.min(100, Math.round((fundraiser.raisedCents / fundraiser.goalCents) * 100)) : null;
  const shareUrl = `${publicPortalUrl(tenantSlug)}/fundraise/${fundraiser.slug}`;
  const message = statusMessage(query.status, query.error);
  const displayName = fundraiser.title || `${fundraiser.owner.firstName} ${fundraiser.owner.lastName}`;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="jg-eyebrow">
          <Link href={`/portal/${tenantSlug}/campaigns/${fundraiser.campaign.slug}`} className="hover:text-foreground">
            {fundraiser.campaign.title}
          </Link>
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fundraising for {fundraiser.owner.firstName} {fundraiser.owner.lastName}
        </p>
      </div>

      {fundraiser.story && (
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{fundraiser.story}</p>
      )}

      <div className="jg-card p-5 sm:p-6">
        <p className="text-2xl font-extrabold text-foreground">{formatMoneyCents(fundraiser.raisedCents)} raised</p>
        {fundraiser.goalCents ? (
          <>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">of {formatMoneyCents(fundraiser.goalCents)} goal · {pct}%</p>
          </>
        ) : null}
        <div className="mt-4">
          <CopyTextButton text={shareUrl} label="Copy this page's link" />
        </div>
      </div>

      {message && <Alert variant={query.error ? "error" : "success"}>{message}</Alert>}

      {query.status !== "thankyou" && (
        <div className="jg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground">Give to {fundraiser.owner.firstName}&apos;s page</h3>
          <form action="/api/public/donate" method="post" className="mt-4 space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="fundraiserSlug" value={fundraiser.slug} />

            <fieldset>
              <legend className="text-sm font-medium text-foreground">Gift amount</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DONATION_PRESET_CENTS.map((cents) => (
                  <label
                    key={cents}
                    className="flex cursor-pointer items-center justify-center rounded-xl border border-input px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                  >
                    <input type="radio" name="amountPreset" value={cents} defaultChecked={cents === 5000} className="sr-only" />
                    {formatMoneyCents(cents)}
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

            <FormField label="Message (optional)">
              <Textarea name="dedication" rows={3} />
            </FormField>

            <CoverProcessingFeeField baseCents={5000} />

            <Button type="submit">
              Continue to secure checkout
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <HeartHandshake className="h-4 w-4" />
        100% of every donation goes to the organization — JanaGana charges no platform fee.
      </p>
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, fundraiserSlug } = await params;
  return { title: `${fundraiserSlug} — ${tenantSlug} fundraising page` };
}
