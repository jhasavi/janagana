import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { cancelEventRegistration, confirmEventRegistration, listEventRegistrations } from "@/lib/actions/events";

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const result = await listEventRegistrations(eventId);

  if (!result.ok || !result.event) {
    notFound();
  }

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

  const confirmedCount = result.data.filter((reg) => reg.status === "CONFIRMED").length;
  const totalCount = result.data.length;

  return (
    <section>
      <div className="flex items-center gap-4">
        <Link href="/dashboard/events" className="text-sm text-blue-700 hover:underline">
          ← Events
        </Link>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold">Registrations</h1>
        <p className="mt-1 text-sm text-gray-600">
          {result.event.title} &mdash; {formatDate(result.event.startsAt)}
        </p>
        <p className="mt-1 text-xs text-gray-400">Status: {result.event.status}</p>
        <p className="mt-1 text-xs text-gray-500">
          {confirmedCount} confirmed{totalCount !== confirmedCount ? ` / ${totalCount} total` : ""}
        </p>
      </div>

      {query.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>}
      {query.success && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>}

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {result.data.length === 0 ? (
          <p className="text-sm text-gray-500">No registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((reg) => (
                  <tr key={reg.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      {reg.contact.firstName} {reg.contact.lastName}
                    </td>
                    <td className="py-2 pr-4">{reg.contact.email}</td>
                    <td className="py-2 pr-4">{reg.contact.phone ?? "—"}</td>
                    <td className="py-2 pr-4">{reg.status}</td>
                    <td className="py-2 pr-4">{formatDate(reg.createdAt)}</td>
                    <td className="py-2 pr-4">
                      {reg.status === "CONFIRMED" ? (
                        <form action={cancelRegistrationAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <button type="submit" className="text-xs text-red-700 hover:underline">
                            Cancel
                          </button>
                        </form>
                      ) : reg.status === "CANCELED" ? (
                        <form action={confirmRegistrationAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <button type="submit" className="text-xs text-blue-700 hover:underline">
                            Mark confirmed
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">{result.data.length} registrant{result.data.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </section>
  );
}
