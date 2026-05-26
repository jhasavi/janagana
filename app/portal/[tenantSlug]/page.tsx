import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCents } from "@/lib/utils";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PortalHomePage({ params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const upcomingEvents = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      status: "PUBLISHED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Community portal</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming events</h2>

          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events at this time.</p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/portal/${tenantSlug}/events/${event.slug}`}
                  className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(event.startsAt)}</p>
                      {event.location && (
                        <p className="text-sm text-gray-400 mt-0.5">{event.location}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-600 shrink-0 ml-4">
                      {formatCents(event.priceCents)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  return {
    title: tenant ? `${tenant.name} — Portal` : "Portal",
  };
}
