import { notFound } from 'next/navigation'
import { getPortalContext, getPortalEvents, getPortalEventCancellationRequests } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import { PortalEventsClient } from './_components/portal-events-client'

export default async function PortalEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [ctx, eventsResult] = await Promise.all([
    getPortalContext(slug),
    getPortalEvents(slug),
  ])
  if (!ctx) notFound()

  const events = eventsResult.data ?? []

  const cancelRequestsResult = await getPortalEventCancellationRequests(ctx.member.id, ctx.tenant.id)
  const cancellationRequests = cancelRequestsResult.success ? cancelRequestsResult.data : []

  // Find which events this member already registered for
  const registrations = await prisma.eventRegistration.findMany({
    where: { memberId: ctx.member.id },
    select: { eventId: true, status: true },
  })
  const registeredEventIds = registrations.filter((r) => r.status === 'CONFIRMED').map((r) => r.eventId)
  const waitlistedEventIds = registrations.filter((r) => r.status === 'WAITLISTED').map((r) => r.eventId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upcoming Events</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse and register for events from {ctx.tenant.name}.
        </p>
      </div>
      <PortalEventsClient
        events={events}
        registeredEventIds={registeredEventIds}
        waitlistedEventIds={waitlistedEventIds}
        cancellationRequests={cancellationRequests.map((request) => ({
          eventId: request.eventId,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
        }))}
        slug={slug}
      />
    </div>
  )
}
