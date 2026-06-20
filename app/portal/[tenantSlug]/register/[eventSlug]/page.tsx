import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Send, Ticket } from "lucide-react";
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
    <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-stone-200 bg-teal-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-teal-50">
          <Ticket className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">Event registration</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">Register for {eventResult.data.title}</h1>
        <p className="mt-3 text-sm leading-6 text-teal-50">{eventResult.tenant.name}</p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      {message && (
        <p className="rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-950">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </span>
        </p>
      )}

      {backUrl && query.status && (
        <p className="mt-3">
          <a href={backUrl} className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Return to community website
          </a>
        </p>
      )}

      {!query.status && (
        <form action={registerAction} className="mt-6 space-y-4">
          {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}
          {eventResult.data.ticketTypes.length > 0 && (
            <label className="block text-sm font-medium text-slate-700">
              Ticket
              <select name="ticketTypeId" required className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
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
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              First name
              <input name="firstName" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Last name
              <input name="lastName" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input type="email" name="email" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input name="phone" type="tel" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">
              Complete registration
              <Send className="h-4 w-4" />
            </button>
            {backUrl && (
              <Link href={backUrl} className="text-sm font-medium text-slate-600 hover:text-slate-950">
                Cancel
              </Link>
            )}
          </div>
        </form>
      )}
      </section>
    </main>
  );
}
