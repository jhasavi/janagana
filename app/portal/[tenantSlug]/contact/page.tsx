import { redirect } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid, Input, Textarea } from "@/components/ui/input";
import { capturePublicLead, listPublishedPortalEvents } from "@/lib/actions/public-portal";
import {
  defaultVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";
import { readRefererHeader, readUtmParams, UTM_FORM_FIELDS, utmFromFormData } from "@/lib/portal/utm";

const RETURN_TO_FIELD = "returnTo";

const ALLOWED_INTERESTS = [
  "NEWSLETTER",
  "CLASS_INTEREST",
  "MEMBERSHIP_INTEREST",
  "INVESTMENT_ANALYSIS",
] as const;

type InterestType = (typeof ALLOWED_INTERESTS)[number];

const INTEREST_ALIASES: Record<string, InterestType> = {
  NEWSLETTER: "NEWSLETTER",
  CLASS: "CLASS_INTEREST",
  CLASS_INTEREST: "CLASS_INTEREST",
  MEMBERSHIP: "MEMBERSHIP_INTEREST",
  MEMBERSHIP_INTEREST: "MEMBERSHIP_INTEREST",
  INVESTMENT: "INVESTMENT_ANALYSIS",
  INVESTMENT_ANALYSIS: "INVESTMENT_ANALYSIS",
};

function normalizeInterest(raw: string | undefined): InterestType {
  const value = (raw ?? "").trim().toUpperCase().replace(/-/g, "_");
  if (INTEREST_ALIASES[value]) {
    return INTEREST_ALIASES[value];
  }
  if (ALLOWED_INTERESTS.includes(value as InterestType)) {
    return value as InterestType;
  }
  return "NEWSLETTER";
}

function interestLabel(value: InterestType): string {
  switch (value) {
    case "CLASS_INTEREST":
      return "Classes & events interest";
    case "MEMBERSHIP_INTEREST":
      return "Membership interest";
    case "INVESTMENT_ANALYSIS":
      return "Investment analysis request";
    default:
      return "Newsletter signup";
  }
}

export default async function PublicContactCapturePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    interest?: string;
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
  const safeReturnTo = readSafeReturnUrl(query.returnTo);
  const portal = await listPublishedPortalEvents(tenantSlug);

  if (!portal.ok || !portal.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  const initialInterest = normalizeInterest(query.interest);
  const utm = readUtmParams(query);

  async function captureAction(formData: FormData) {
    "use server";

    const interest = normalizeInterest(String(formData.get("interestType") ?? "NEWSLETTER"));
    const returnTo = readSafeReturnUrl(String(formData.get(RETURN_TO_FIELD) ?? ""));
    const utmFields = utmFromFormData(formData);
    const referrerUrl = await readRefererHeader();

    const result = await capturePublicLead({
      tenantSlug,
      interestType: interest,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      message: String(formData.get("message") ?? ""),
      source: "portal_contact_page",
      utmSource: utmFields.utmSource ?? undefined,
      utmMedium: utmFields.utmMedium ?? undefined,
      utmCampaign: utmFields.utmCampaign ?? undefined,
      referrerUrl: referrerUrl ?? undefined,
    });

    if (!result.ok) {
      const errorParams = new URLSearchParams({
        interest: interest.toLowerCase(),
        error: result.error,
      });
      if (returnTo) errorParams.set("returnTo", returnTo);
      redirect(`/portal/${tenantSlug}/contact?${errorParams.toString()}`);
    }

    const returnBase = returnTo ?? defaultVisitorReturnUrl(tenantSlug);
    if (returnBase) {
      redirect(visitorReturnUrlWithStatus(returnBase, "lead", "success"));
    }

    redirect(`/portal/${tenantSlug}/contact?interest=${interest.toLowerCase()}&status=success`);
  }

  const message =
    query.status === "success"
      ? "Thanks. We received your details and will follow up soon."
      : query.error ?? null;
  const backUrl = safeReturnTo ?? defaultVisitorReturnUrl(tenantSlug);

  return (
    <PortalFlowLayout
      icon={<Sparkles className="h-5 w-5" />}
      eyebrow="Stay connected"
      title={portal.tenant.name}
      description={interestLabel(initialInterest)}
      backHref={backUrl}
    >
      {message && <Alert variant={query.status === "success" ? "success" : "error"}>{message}</Alert>}

      {backUrl && query.status === "success" && (
        <p className="mt-3">
          <a href={backUrl} className="text-sm font-semibold text-primary hover:text-foreground">
            Return to community website
          </a>
        </p>
      )}

      {query.status !== "success" && (
        <form action={captureAction} className="mt-4 space-y-4">
          <input type="hidden" name="interestType" value={initialInterest} />
          {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}
          {utm.utmSource ? <input type="hidden" name={UTM_FORM_FIELDS.source} value={utm.utmSource} /> : null}
          {utm.utmMedium ? <input type="hidden" name={UTM_FORM_FIELDS.medium} value={utm.utmMedium} /> : null}
          {utm.utmCampaign ? <input type="hidden" name={UTM_FORM_FIELDS.campaign} value={utm.utmCampaign} /> : null}

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

          <FormField label="Message (optional)">
            <Textarea name="message" rows={4} />
          </FormField>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">
              Submit
              <Send className="h-4 w-4" />
            </Button>
            {backUrl && (
              <a href={backUrl} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Cancel
              </a>
            )}
          </div>
        </form>
      )}
    </PortalFlowLayout>
  );
}
