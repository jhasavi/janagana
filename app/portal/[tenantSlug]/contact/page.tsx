import { redirect } from "next/navigation";
import { capturePublicLead, listPublishedPortalEvents } from "@/lib/actions/public-portal";

const ALLOWED_INTERESTS = [
  "NEWSLETTER",
  "CLASS_INTEREST",
  "MEMBERSHIP_INTEREST",
  "INVESTMENT_ANALYSIS",
] as const;

type InterestType = (typeof ALLOWED_INTERESTS)[number];

function normalizeInterest(raw: string | undefined): InterestType {
  const value = (raw ?? "").trim().toUpperCase().replace(/-/g, "_");
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
  searchParams: Promise<{ interest?: string; status?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const portal = await listPublishedPortalEvents(tenantSlug);

  if (!portal.ok || !portal.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  const initialInterest = normalizeInterest(query.interest);

  async function captureAction(formData: FormData) {
    "use server";

    const interest = normalizeInterest(String(formData.get("interestType") ?? "NEWSLETTER"));

    const result = await capturePublicLead({
      tenantSlug,
      interestType: interest,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      message: String(formData.get("message") ?? ""),
      source: "portal_contact_page",
    });

    if (!result.ok) {
      redirect(`/portal/${tenantSlug}/contact?interest=${interest.toLowerCase()}&error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/portal/${tenantSlug}/contact?interest=${interest.toLowerCase()}&status=success`);
  }

  const message = query.status === "success" ? "Thanks. We received your details and will follow up soon." : query.error ?? null;

  return (
    <main className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Public contact</p>
      <h1 className="mt-2 text-3xl font-semibold">{portal.tenant.name}</h1>
      <p className="mt-2 text-sm text-slate-600">{interestLabel(initialInterest)}</p>

      {message && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">{message}</p>}

      <form action={captureAction} className="mt-6 space-y-4">
        <input type="hidden" name="interestType" value={initialInterest} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            First name
            <input name="firstName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Last name
            <input name="lastName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input type="email" name="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone
          <input name="phone" type="tel" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Message (optional)
          <textarea name="message" rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <button type="submit" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Submit
        </button>
      </form>
    </main>
  );
}
