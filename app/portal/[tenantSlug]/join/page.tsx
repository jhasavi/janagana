import { redirect } from "next/navigation";
import { ArrowRight, Check, CreditCard, HeartHandshake } from "lucide-react";
import { CoverProcessingFeeField } from "@/components/portal/cover-processing-fee-field";
import { AutoRenewField } from "@/components/portal/recurring-billing-fields";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormGrid, Input } from "@/components/ui/input";
import { createPublicMembershipCheckout, listPublicMembershipTiers } from "@/lib/actions/public-memberships";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import { formatCents } from "@/lib/utils";

function statusMessage(status?: string, error?: string) {
  if (error) return error;
  if (status === "processing") return "Payment received by Stripe. Your membership will activate as soon as confirmation arrives.";
  if (status === "joined") return "Membership activated. Your receipt has been recorded.";
  if (status === "canceled") return "Checkout was canceled. You can choose a membership and try again.";
  return null;
}

/** Turn a free-text tier description into short comparison bullets. */
function tierFeatures(tier: { description: string | null; interval: string }): string[] {
  if (tier.description) {
    const parts = tier.description
      .split(/[•;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.slice(0, 4);
  }
  const intervalLabel = tier.interval === "ONE_TIME" ? "one-time" : tier.interval.toLowerCase();
  return ["Full member access", `Billed ${intervalLabel}`, "Cancel anytime"];
}

export default async function PublicMembershipJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const result = await listPublicMembershipTiers(tenantSlug);

  if (!result.ok || !result.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  async function checkoutAction(formData: FormData) {
    "use server";

    const checkout = await createPublicMembershipCheckout({
      tenantSlug,
      tierId: String(formData.get("tierId") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      coverProcessingFee: formData.get("coverProcessingFee") === "1",
      autoRenew: formData.get("autoRenew") === "1",
    });

    if (!checkout.ok || !checkout.checkoutUrl) {
      redirect(`/portal/${tenantSlug}/join?error=${encodeURIComponent(checkout.error ?? "Checkout failed")}`);
    }

    redirect(checkout.checkoutUrl);
  }

  const message = statusMessage(query.status, query.error);
  const defaultTierId = result.data[0]?.id ?? "";
  // Middle tier gets the "Most popular" highlight when there are exactly 3 — the
  // classic good/better/best pattern. With a different count we skip the claim
  // rather than guess.
  const featuredIndex = result.data.length === 3 ? 1 : -1;

  return (
    <PortalFlowLayout
      icon={<HeartHandshake className="h-5 w-5" />}
      eyebrow="Membership"
      title={`Join ${result.tenant.name}`}
      description="Compare plans, pick the one that fits, and enter your details. Paid memberships continue to secure checkout."
    >
      <p className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground">
        <CreditCard className="h-4 w-4 text-primary" />
        {paymentFeeDisclosure()}
      </p>

      {message && (
        <Alert variant={query.error ? "error" : "success"} className="mt-4">
          {message}
        </Alert>
      )}

      {result.data.length === 0 ? (
        <EmptyState title="Memberships not open yet" description="Please check back soon." />
      ) : (
        <form action={checkoutAction} className="mt-6 space-y-8">
          <div>
            <h2 className="text-lg font-bold text-foreground">Compare plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select the plan that is right for you.</p>
            <div className={`mt-4 grid gap-4 ${result.data.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
              {result.data.map((tier, index) => {
                const featured = index === featuredIndex;
                return (
                  <label key={tier.id} className="group relative block cursor-pointer">
                    <input
                      type="radio"
                      name="tierId"
                      value={tier.id}
                      defaultChecked={tier.id === defaultTierId}
                      className="peer sr-only"
                      required
                    />
                    {featured && (
                      <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10.5px] font-bold text-accent-foreground">
                        Most popular
                      </span>
                    )}
                    <div className="flex h-full flex-col rounded-2xl border-2 border-border/80 bg-card p-5 shadow-sm transition-all peer-checked:border-primary peer-checked:shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <h3 className="text-base font-bold text-foreground">{tier.name}</h3>
                      <p className="mt-2">
                        <span className="text-2xl font-extrabold text-foreground">{formatCents(tier.amountCents)}</span>
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          / {tier.interval === "ONE_TIME" ? "one-time" : tier.interval.toLowerCase()}
                        </span>
                      </p>
                      <ul className="mt-4 flex-1 space-y-2">
                        {tierFeatures(tier).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors peer-checked:border-primary/40 peer-checked:bg-primary/10 peer-checked:text-primary">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                          <span className="hidden h-1.5 w-1.5 rounded-full bg-current group-has-[:checked]:block" />
                        </span>
                        Select {tier.name}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t border-border/70 pt-6">
            <h2 className="text-lg font-bold text-foreground">Your details</h2>
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

            <FormField label="Phone">
              <Input name="phone" type="tel" />
            </FormField>

            <CoverProcessingFeeField baseCents={result.data[0]?.amountCents ?? 0} />
            <AutoRenewField defaultChecked />

            <Button type="submit">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </PortalFlowLayout>
  );
}
