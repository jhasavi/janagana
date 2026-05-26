import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantByClerkOrgId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCents, formatDate } from "@/lib/utils";

export default async function EventsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const tenant = await getTenantByClerkOrgId(orgId);
  if (!tenant) redirect("/onboarding/create-organization");

  const events = await prisma.event.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          href="/dashboard/events/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No events yet.</p>
          <Link
            href="/dashboard/events/new"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{event.title}</div>
                    {event.location && (
                      <div className="text-xs text-gray-400">{event.location}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatCents(event.priceCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {event._count.registrations}
                    {event.capacity ? ` / ${event.capacity}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PUBLISHED: "bg-green-100 text-green-700",
    CANCELED: "bg-red-100 text-red-600",
    COMPLETED: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
