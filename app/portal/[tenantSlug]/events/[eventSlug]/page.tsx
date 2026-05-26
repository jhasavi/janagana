import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCents } from "@/lib/utils";

interface Props {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { tenantSlug, eventSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const event = await prisma.event.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: eventSlug } },
  });

  if (!event || event.status !== "PUBLISHED") notFound();

  const registrationCount = await prisma.eventRegistration.count({
    where: { eventId: event.id, status: { in: ["CONFIRMED", "ATTENDED"] } },
  });

  const isFull = event.capacity !== null && registrationCount >= event.capacity;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={`/portal/${tenantSlug}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← {tenant.name}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📅</span>
              <span>{formatDate(event.startsAt)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>📍</span>
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>💰</span>
              <span>{formatCents(event.priceCents)}</span>
            </div>
            {event.capacity && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>👥</span>
                <span>
                  {registrationCount} / {event.capacity} registered
                  {isFull && <span className="ml-1 text-red-600 font-medium">(Full)</span>}
                </span>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mt-6 prose prose-sm text-gray-700 max-w-none">
              <p>{event.description}</p>
            </div>
          )}

          <div className="mt-8">
            {isFull ? (
              <button
                disabled
                className="bg-gray-200 text-gray-500 text-sm px-6 py-3 rounded-md cursor-not-allowed"
              >
                Event is full
              </button>
            ) : (
              <Link
                href={`/portal/${tenantSlug}/register/${eventSlug}`}
                className="inline-block bg-blue-600 text-white text-sm px-6 py-3 rounded-md hover:bg-blue-700"
              >
                Register for this event
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, eventSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return {};
  const event = await prisma.event.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: eventSlug } },
    select: { title: true },
  });
  return { title: event ? `${event.title} — ${tenant.name}` : "Event" };
}
