import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { listEventRegistrations } from "@/lib/actions/events";

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const result = await listEventRegistrations(eventId);

  if (!result.ok || !result.event) {
    notFound();
  }

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
      </div>

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
