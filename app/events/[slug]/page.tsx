import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, MapPin, Users, DollarSign, Globe } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatCurrency } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { name: true } })
  if (!tenant) return { title: 'Events' }
  return { title: `Events — ${tenant.name}` }
}

export default async function PublicEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, primaryColor: true, logoUrl: true },
  })
  if (!tenant) notFound()

  const events = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      status: 'PUBLISHED',
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      location: true,
      virtualLink: true,
      priceCents: true,
      capacity: true,
      _count: { select: { registrations: true } },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
          {tenant.logoUrl && (
            <Image src={tenant.logoUrl} alt={tenant.name} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          )}
          <div>
            <h1 className="font-bold text-lg">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground">Upcoming Events</p>
          </div>
          <div className="ml-auto">
            <Button asChild size="sm" variant="outline">
              <Link href={`/join/${slug}`}>Become a Member</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No upcoming events at this time.</p>
          </div>
        ) : (
          events.map((event) => {
            const spotsLeft =
              event.capacity != null
                ? event.capacity - event._count.registrations
                : null
            const isFull = spotsLeft !== null && spotsLeft <= 0

            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-base">{event.title}</h3>
                    <div className="shrink-0 flex items-center gap-2">
                      {isFull && <Badge variant="secondary">Full</Badge>}
                      {event.priceCents > 0 && (
                        <Badge variant="outline">{formatCurrency(event.priceCents)}</Badge>
                      )}
                      {event.priceCents === 0 && !isFull && (
                        <Badge variant="success">Free</Badge>
                      )}
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDateTime(event.startDate)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                    {event.virtualLink && !event.location && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Virtual
                      </span>
                    )}
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {spotsLeft != null && spotsLeft > 0
                          ? `${spotsLeft} spots left`
                          : `${event._count.registrations}/${event.capacity} registered`}
                      </span>
                    )}
                  </div>
                  <div className="pt-1">
                    <Button asChild size="sm" variant={isFull ? 'secondary' : 'default'}>
                      <Link href={`/portal/${slug}/events`}>
                        {isFull ? 'Join Waitlist' : 'Register →'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
