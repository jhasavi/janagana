import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublishedPortalEvent, registerPublicEvent } from "@/lib/actions/public-portal";
import {
  defaultVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";

const RETURN_TO_FIELD = "returnTo";

export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string; returnTo?: string }>;
}) {
  const { tenantSlug, eventSlug } = await params;
  const eventResult = await getPublishedPortalEvent(tenantSlug, eventSlug);
  const query = await searchParams;
  const safeReturnTo = readSafeReturnUrl(query.returnTo);

  if (!eventResult.ok || !eventResult.tenant || !eventResult.data) {
    redirect(`/portal/${tenantSlug}/events/${eventSlug}`);
  }

  async function registerAction(formData: FormData) {
    "use server";

    const returnTo = readSafeReturnUrl(String(formData.get(RETURN_TO_FIELD) ?? ""));

    const result = await registerPublicEvent({
      tenantSlug,
      eventSlug,
      ticketTypeId: String(formData.get("ticketTypeId") ?? ""),
      quantity: Number(String(formData.get("quantity") ?? "1")),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!result.ok) {
      const errorParams = new URLSearchParams({ error: result.error });
      if (returnTo) errorParams.set("returnTo", returnTo);
      redirect(`/portal/${tenantSlug}/register/${eventSlug}?${errorParams.toString()}`);
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
      : query.status === "pending-payment"
        ? "Registration saved. Payment is due before confirmation."
        : query.status === "already-registered"
          ? "You are already registered."
          : query.error
            ? query.error
            : null;

  const backUrl = safeReturnTo ?? defaultVisitorReturnUrl(tenantSlug);

  return (
    <main className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Public registration</p>
      <h1 className="mt-2 text-3xl font-semibold">Register for {eventResult.data.title}</h1>
      <p className="mt-3 text-sm text-slate-600">{eventResult.tenant.name}</p>

      {message && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">{message}</p>}

      {backUrl && query.status && (
        <p className="mt-3">
          <a href={backUrl} className="text-sm font-medium text-blue-700 hover:underline">
            ← Return to community website
          </a>
        </p>
      )}

      {!query.status && (
        <form action={registerAction} className="mt-6 space-y-4">
          {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}
          {eventResult.data.ticketTypes.length > 0 && (
            <label className="block text-sm font-medium text-slate-700">
              Ticket
              <select name="ticketTypeId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {eventResult.data.ticketTypes.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.name} - {ticket.priceCents === 0 ? "Free" : `$${(ticket.priceCents / 100).toFixed(2)}`}
                    {ticket.memberPriceCents !== null ? ` / member $${(ticket.memberPriceCents / 100).toFixed(2)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Quantity
            <input
              name="quantity"
              type="number"
              min="1"
              max="10"
              defaultValue="1"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
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
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Complete registration
            </button>
            {backUrl && (
              <Link href={backUrl} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                Cancel
              </Link>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
