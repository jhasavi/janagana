import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import {
  cancelEventRegistration,
  checkInEventRegistration,
  confirmEventRegistration,
  listEventRegistrations,
  markEventRegistrationNoShow,
} from "@/lib/actions/events";
import { publicRegisterUrl } from "@/lib/pilot/tenants";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const result = await listEventRegistrations(eventId);

  if (!result.ok || !result.event) {
    notFound();
  }

  const registerUrl =
    tenant && result.event.status === "PUBLISHED"
      ? publicRegisterUrl(tenant.slug, result.event.slug)
      : null;

  async function cancelRegistrationAction(formData: FormData) {
    "use server";

    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await cancelEventRegistration({ eventId, registrationId });

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to cancel registration";
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration canceled")}`);
  }

  async function confirmRegistrationAction(formData: FormData) {
    "use server";

    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await confirmEventRegistration({ eventId, registrationId });

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to confirm registration";
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration confirmed")}`);
  }

  async function checkInRegistrationAction(formData: FormData) {
    "use server";

    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await checkInEventRegistration({ eventId, registrationId });

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to check in attendee";
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Attendee checked in")}`);
  }

  async function noShowRegistrationAction(formData: FormData) {
    "use server";

    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await markEventRegistrationNoShow({ eventId, registrationId });

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to mark no-show";
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration marked no-show")}`);
  }

  const confirmedCount = result.data
    .filter((reg) => reg.status === "CONFIRMED" || reg.status === "ATTENDED")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const pendingPaymentCount = result.data
    .filter((reg) => reg.status === "PENDING_PAYMENT")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const attendedCount = result.data
    .filter((reg) => reg.status === "ATTENDED")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const totalCount = result.data.reduce((sum, reg) => sum + reg.quantity, 0);

  return (
    <section className="space-y-4">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <Link href="/dashboard/events" className="text-sm font-medium text-blue-700 hover:underline">
        ← Back to events
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Event registrations</h1>
          <a
            href={`/api/export/events/${eventId}/registrations`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
        <p className="mt-1 text-lg text-gray-900">{result.event.title}</p>
        <p className="mt-1 text-sm text-gray-600">{formatDate(result.event.startsAt)}</p>
        <p className="mt-2 text-sm">
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
              result.event.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"
            }`}
          >
            {result.event.status === "PUBLISHED" ? "Published" : "Draft — not on portal"}
          </span>
          <span className="ml-2 text-gray-600">
            {confirmedCount} confirmed
            {totalCount !== confirmedCount ? ` (${totalCount} total)` : ""}
            {pendingPaymentCount > 0 ? ` · ${pendingPaymentCount} pending payment` : ""}
            {attendedCount > 0 ? ` · ${attendedCount} checked in` : ""}
          </span>
        </p>
        {registerUrl && (
          <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            <p className="font-medium">Share this registration link</p>
            <p className="mt-1 break-all font-mono text-xs">{registerUrl}</p>
            <div className="mt-2 flex gap-2">
              <CopyTextButton text={registerUrl} label="Copy register link" />
              <a href={registerUrl} target="_blank" rel="noreferrer" className="text-blue-800 underline">
                Open in portal ↗
              </a>
            </div>
          </div>
        )}
        {result.event.status !== "PUBLISHED" && tenant && (
          <p className="mt-2 text-sm text-amber-800">
            This event is not published — visitors cannot register until you set status to Published on the Events page.
          </p>
        )}
      </div>

      {query.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>}
      {query.success && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>}

      <p className="text-sm text-gray-600">
        Each row should also appear under{" "}
        <Link href="/dashboard/members" className="text-blue-700 underline">
          Contacts & leads
        </Link>{" "}
        with intent Event registration.
      </p>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        {result.data.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
            <p className="font-medium text-gray-900">No registrations yet</p>
            <p className="mt-2">
              Test in incognito: open the register link above, submit a unique email, then refresh this page and Contacts.
            </p>
            {registerUrl && (
              <a href={registerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-700 underline break-all">
                {registerUrl}
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Registrant</th>
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((reg) => (
                  <tr key={reg.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">
                        {reg.contact.firstName} {reg.contact.lastName}
                      </p>
                      <p className="text-gray-600">{reg.contact.email}</p>
                      <p className="text-xs text-gray-500">{reg.contact.phone ?? "No phone"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{reg.ticketType?.name ?? "General admission"}</p>
                      <p className="text-xs text-gray-500">
                        Qty {reg.quantity} · {formatCents(reg.amountCents)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{reg.status}</span>
                      {reg.checkedInAt && (
                        <p className="mt-1 text-xs text-gray-500">Checked in {formatRelativeTime(reg.checkedInAt)}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {reg.payments.length === 0 ? (
                        <span className="text-xs text-gray-500">{reg.amountCents > 0 ? "No payment record" : "Free"}</span>
                      ) : (
                        <ul className="space-y-1">
                          {reg.payments.map((payment) => (
                            <li key={payment.id} className="text-xs text-gray-700">
                              <span className="font-medium">{formatCents(payment.amountCents)}</span>
                              {" · "}
                              {payment.status}
                              {" · "}
                              {payment.method.replace(/_/g, " ")}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600" title={formatDate(reg.createdAt)}>
                      {formatRelativeTime(reg.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col items-start gap-1">
                        {(reg.status === "PENDING_PAYMENT" || reg.status === "CANCELED" || reg.status === "NO_SHOW") && (
                          <form action={confirmRegistrationAction}>
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-blue-700 hover:underline">
                              Mark confirmed
                            </button>
                          </form>
                        )}
                        {reg.status === "CONFIRMED" && (
                          <form action={checkInRegistrationAction}>
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-emerald-700 hover:underline">
                              Check in
                            </button>
                          </form>
                        )}
                        {(reg.status === "CONFIRMED" || reg.status === "PENDING_PAYMENT") && (
                          <form action={noShowRegistrationAction}>
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-amber-700 hover:underline">
                              Mark no-show
                            </button>
                          </form>
                        )}
                        {reg.status !== "CANCELED" && (
                          <form action={cancelRegistrationAction}>
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-red-700 hover:underline">
                              Cancel registration
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
