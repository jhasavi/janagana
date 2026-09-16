import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Send, Ticket } from "lucide-react";
import { CoverProcessingFeeField } from "@/components/portal/cover-processing-fee-field";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid, Input, Select } from "@/components/ui/input";
import { getPublishedPortalEvent, registerPublicEvent } from "@/lib/actions/public-portal";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import {
  defaultVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";
import { readRefererHeader, readUtmParams, UTM_FORM_FIELDS, utmFromFormData } from "@/lib/portal/utm";
import { readReferralCode, referralCodeFromFormData, REFERRAL_FORM_FIELD } from "@/lib/portal/referral";

const RETURN_TO_FIELD = "returnTo";

export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    returnTo?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    ref?: string;
  }>;
}) {
  const { tenantSlug, eventSlug } = await params;
  const eventResult = await getPublishedPortalEvent(tenantSlug, eventSlug);
  const query = await searchParams;
  const safeReturnTo = readSafeReturnUrl(query.returnTo);
  const utm = readUtmParams(query);
  const referralCode = readReferralCode(query);

  if (!eventResult.ok || !eventResult.tenant || !eventResult.data) {
    redirect(`/portal/${tenantSlug}/events/${eventSlug}`);
  }

  async function registerAction(formData: FormData) {
    "use server";

    const returnTo = readSafeReturnUrl(String(formData.get(RETURN_TO_FIELD) ?? ""));
    const utmFields = utmFromFormData(formData);
    const referrerUrl = await readRefererHeader();
    const ref = referralCodeFromFormData(formData);

    const result = await registerPublicEvent({
      tenantSlug,
      eventSlug,
      ticketTypeId: String(formData.get("ticketTypeId") ?? ""),
      quantity: Number(String(formData.get("quantity") ?? "1")),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      coverProcessingFee: formData.get("coverProcessingFee") === "1",
      utmSource: utmFields.utmSource ?? undefined,
      utmMedium: utmFields.utmMedium ?? undefined,
      utmCampaign: utmFields.utmCampaign ?? undefined,
      referrerUrl: referrerUrl ?? undefined,
      ref: ref ?? undefined,
    });

    if (!result.ok) {
      const errorParams = new URLSearchParams({ error: result.error });
      if (returnTo) errorParams.set("returnTo", returnTo);
      redirect(`/portal/${tenantSlug}/register/${eventSlug}?${errorParams.toString()}`);
    }

    if ("checkoutUrl" in result && result.checkoutUrl) {
      redirect(result.checkoutUrl);
    }

    const status = result.alreadyRegistered
      ? "already-registered"
      : result.registration?.status === "PENDING_PAYMENT"
        ? "pending-payment"
        : "registered";

    const returnBase = returnTo ?? defaultVisitorReturnUrl(tenantSlug);
    if (returnBase) {
      redirect(visitorReturnUrlWithStatus(returnBase, "registration", status));
    }

    redirect(`/portal/${tenantSlug}/register/${eventSlug}?status=${status}`);
  }

  const message =
    query.status === "registered"
      ? "Registration successful."
      : query.status === "processing"
        ? "Payment received. Your registration will confirm as soon as Stripe confirms."
      : query.status === "pending-payment"
        ? "Registration saved. Payment is due before confirmation."
        : query.status === "already-registered"
          ? "You are already registered."
          : query.error
            ? query.error
            : null;

  const backUrl = safeReturnTo ?? defaultVisitorReturnUrl(tenantSlug);
  const hasPaidTickets =
    eventResult.data.priceCents > 0 ||
    eventResult.data.ticketTypes.some((ticket) => ticket.priceCents > 0);
  const defaultTicketCents =
    eventResult.data.ticketTypes[0]?.priceCents ?? eventResult.data.priceCents;

  return (
    <PortalFlowLayout
      icon={<Ticket className="h-5 w-5" />}
      eyebrow="Event registration"
      title={`Register for ${eventResult.data.title}`}
      description={eventResult.tenant.name}
      backHref={backUrl}
    >
      {message && (
        <Alert variant={query.error ? "error" : "success"}>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </span>
        </Alert>
      )}

      {backUrl && query.status && (
        <p className="mt-3">
          <a href={backUrl} className="text-sm font-semibold text-primary hover:text-foreground">
            Return to community website
          </a>
        </p>
      )}

      {!query.status && (
        <form action={registerAction} className="mt-4 space-y-4">
          {hasPaidTickets && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">{paymentFeeDisclosure()}</p>
          )}
          {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}
          {utm.utmSource ? <input type="hidden" name={UTM_FORM_FIELDS.source} value={utm.utmSource} /> : null}
          {utm.utmMedium ? <input type="hidden" name={UTM_FORM_FIELDS.medium} value={utm.utmMedium} /> : null}
          {utm.utmCampaign ? <input type="hidden" name={UTM_FORM_FIELDS.campaign} value={utm.utmCampaign} /> : null}
          {referralCode ? <input type="hidden" name={REFERRAL_FORM_FIELD} value={referralCode} /> : null}
          {eventResult.data.ticketTypes.length > 0 && (
            <FormField label="Ticket">
              <Select name="ticketTypeId" required>
                {eventResult.data.ticketTypes.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.name} - {ticket.priceCents === 0 ? "Free" : `$${(ticket.priceCents / 100).toFixed(2)}`}
                    {ticket.memberPriceCents !== null ? ` / member $${(ticket.memberPriceCents / 100).toFixed(2)}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Quantity">
            <Input name="quantity" type="number" min="1" max="10" defaultValue="1" required />
          </FormField>
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
          {hasPaidTickets && <CoverProcessingFeeField baseCents={defaultTicketCents} />}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">
              Complete registration
              <Send className="h-4 w-4" />
            </Button>
            {backUrl && (
              <Link href={backUrl} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Cancel
              </Link>
            )}
          </div>
        </form>
      )}
    </PortalFlowLayout>
  );
}
