import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCents } from "@/lib/utils";
import RegistrationForm from "./RegistrationForm";

interface Props {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}

export default async function RegisterPage({ params }: Props) {
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
        <div className="max-w-xl mx-auto px-4 py-6">
          <Link
            href={`/portal/${tenantSlug}/events/${eventSlug}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to event
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Register</h1>
            <p className="text-gray-600 mt-1 text-sm">{event.title}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{formatDate(event.startsAt)}</span>
              <span>{formatCents(event.priceCents)}</span>
            </div>
          </div>

          {isFull ? (
            <div className="text-center py-8">
              <p className="text-gray-600">This event is at capacity.</p>
              <Link
                href={`/portal/${tenantSlug}/events/${eventSlug}`}
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Back to event
              </Link>
            </div>
          ) : (
            <RegistrationForm
              eventId={event.id}
              tenantSlug={tenantSlug}
              eventSlug={eventSlug}
              eventTitle={event.title}
            />
          )}
        </div>
      </main>
    </div>
  );
}
