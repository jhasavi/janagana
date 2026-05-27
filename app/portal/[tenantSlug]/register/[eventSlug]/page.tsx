import { redirect } from "next/navigation";
import { getPublishedPortalEvent, registerPublicEvent } from "@/lib/actions/public-portal";

export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { tenantSlug, eventSlug } = await params;
  const eventResult = await getPublishedPortalEvent(tenantSlug, eventSlug);
  const query = await searchParams;

  if (!eventResult.ok || !eventResult.tenant || !eventResult.data) {
    redirect(`/portal/${tenantSlug}/events/${eventSlug}`);
  }

  async function registerAction(formData: FormData) {
    "use server";

    const result = await registerPublicEvent({
      tenantSlug,
      eventSlug,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!result.ok) {
      redirect(`/portal/${tenantSlug}/register/${eventSlug}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/portal/${tenantSlug}/register/${eventSlug}?status=${result.alreadyRegistered ? "already-registered" : "registered"}`);
  }

  const message =
    query.status === "registered"
      ? "Registration successful."
      : query.status === "already-registered"
        ? "You are already registered."
        : query.error
          ? query.error
          : null;

  return (
    <main className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Public registration</p>
      <h1 className="mt-2 text-3xl font-semibold">Register for {eventResult.data.title}</h1>
      <p className="mt-3 text-sm text-slate-600">{eventResult.tenant.name}</p>

      {message && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">{message}</p>}

      <form action={registerAction} className="mt-6 space-y-4">
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
        <button type="submit" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Complete registration
        </button>
      </form>
    </main>
  );
}
