import { NextRequest, NextResponse } from "next/server";
import { createPublicDonationCheckout } from "@/lib/actions/public-donations";
import { readSafeReturnUrl } from "@/lib/portal/safe-return-url";

export const runtime = "nodejs";

/**
 * POST /api/public/donate
 *
 * Public donation checkout — no Clerk login. Avoids server-action edge cases for visitors.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tenantSlug = String(form.get("tenantSlug") ?? "").trim();
  const returnTo = readSafeReturnUrl(String(form.get("returnTo") ?? ""));
  const preset = String(form.get("amountPreset") ?? "");
  const customDollars = String(form.get("customAmountDollars") ?? "").trim();
  const amountCents =
    preset === "custom" ? Math.round(Number(customDollars) * 100) : Number(preset);

  const checkout = await createPublicDonationCheckout({
    tenantSlug,
    firstName: String(form.get("firstName") ?? ""),
    lastName: String(form.get("lastName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    amountCents,
    dedication: String(form.get("dedication") ?? ""),
  });

  if (!checkout.ok || !checkout.checkoutUrl) {
    const errorParams = new URLSearchParams({ error: checkout.error ?? "Checkout failed" });
    if (returnTo) errorParams.set("returnTo", returnTo);
    return NextResponse.redirect(new URL(`/portal/${tenantSlug}/donate?${errorParams.toString()}`, req.url));
  }

  return NextResponse.redirect(checkout.checkoutUrl);
}
