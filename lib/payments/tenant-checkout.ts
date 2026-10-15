import { z } from "zod";
import {
  applicationFeePercent,
  calculateCheckoutAmount,
  calculatePlatformTipCents,
  dollarsToCents,
  parsePlatformTipChoice,
  PLATFORM_TIP_CHOICES,
  type PlatformTipChoice,
} from "@/lib/payments/fee-policy";
import type { PaymentRouting } from "@/lib/payments/connect-routing";
import {
  createStripeCheckoutSession,
  createStripeSubscriptionCheckoutSession,
  type StripeRecurringInterval,
} from "@/lib/payments/stripe";

/** Zod fields shared by every public checkout schema. */
export const platformTipInputSchema = {
  platformTipChoice: z
    .enum(PLATFORM_TIP_CHOICES as unknown as [PlatformTipChoice, ...PlatformTipChoice[]])
    .optional()
    .default("0"),
  platformTipCustomCents: z.number().int().min(0).optional().default(0),
};

/** Reads PlatformTipField inputs from a submitted portal form. */
export function platformTipFromForm(form: FormData) {
  return {
    platformTipChoice: parsePlatformTipChoice(form.get("platformTipChoice")),
    platformTipCustomCents: dollarsToCents(form.get("platformTipCustomDollars")),
  };
}

export type CheckoutRoutable = Exclude<PaymentRouting, { mode: "blocked" }>;

/** Fee math for a checkout; tips only apply when the charge is routed through Connect. */
export function checkoutAmountsForRouting(input: {
  routing: PaymentRouting;
  baseCents: number;
  platformTipChoice: PlatformTipChoice;
  platformTipCustomCents?: number;
}) {
  const platformTipCents = input.routing.tipsEnabled
    ? calculatePlatformTipCents({
        baseCents: input.baseCents,
        choice: input.platformTipChoice,
        customCents: input.platformTipCustomCents,
      })
    : 0;
  const amounts = calculateCheckoutAmount({ baseCents: input.baseCents, platformTipCents });
  if (input.routing.mode !== "connect") {
    // Legacy platform charges have no application fee: everything lands on one account.
    return { ...amounts, processingRecoveryCents: 0, applicationFeeCents: 0 };
  }
  return amounts;
}

export type CheckoutAmounts = ReturnType<typeof checkoutAmountsForRouting>;

/** Columns recorded on PaymentRecord for a routed checkout. */
export function paymentRecordConnectFields(routing: PaymentRouting, amounts: CheckoutAmounts) {
  return {
    amountCents: amounts.orgAmountCents,
    platformTipCents: amounts.platformTipCents,
    applicationFeeCents: amounts.applicationFeeCents,
    stripeConnectAccountId: routing.mode === "connect" ? routing.destinationAccountId : null,
  };
}

export async function createTenantCheckoutSession(input: {
  routing: CheckoutRoutable;
  amounts: CheckoutAmounts;
  recurringInterval?: StripeRecurringInterval | null;
  currency?: string;
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
}) {
  const { routing, amounts } = input;
  const destinationAccountId = routing.mode === "connect" ? routing.destinationAccountId : null;
  const metadata = {
    ...input.metadata,
    paymentRouting: routing.mode,
    stripeConnectAccountId: destinationAccountId ?? "",
    orgAmountCents: String(amounts.orgAmountCents),
    platformTipCents: String(amounts.platformTipCents),
    applicationFeeCents: String(amounts.applicationFeeCents),
  };

  if (input.recurringInterval) {
    return createStripeSubscriptionCheckoutSession({
      unitAmountCents: amounts.orgAmountCents,
      platformTipCents: amounts.platformTipCents,
      currency: input.currency,
      interval: input.recurringInterval,
      customerEmail: input.customerEmail,
      productName: input.productName,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      clientReferenceId: input.clientReferenceId,
      metadata,
      connect: destinationAccountId
        ? {
            destinationAccountId,
            applicationFeePercent: applicationFeePercent({
              applicationFeeCents: amounts.applicationFeeCents,
              totalCents: amounts.totalCents,
            }),
          }
        : null,
    });
  }

  return createStripeCheckoutSession({
    amountCents: amounts.orgAmountCents,
    platformTipCents: amounts.platformTipCents,
    currency: input.currency,
    customerEmail: input.customerEmail,
    productName: input.productName,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    clientReferenceId: input.clientReferenceId,
    metadata,
    connect: destinationAccountId
      ? { destinationAccountId, applicationFeeCents: amounts.applicationFeeCents }
      : null,
  });
}
