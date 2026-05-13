import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Globe,
  DollarSign,
  Pencil,
  QrCode,
  Download,
} from 'lucide-react'
import { getEvent } from '@/lib/actions/events'
import { getMembers } from '@/lib/actions/members'
import { formatDateTime, formatCurrency, initials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventRegistrationPanel } from './_components/event-registration-panel'

export const metadata: Metadata = { title: 'Event Detail' }

const statusConfig = {
  DRAFT: { label: 'Draft', variant: 'secondary' as const },
  PUBLISHED: { label: 'Published', variant: 'success' as const },
  CANCELED: { label: 'Canceled', variant: 'destructive' as const },
  COMPLETED: { label: 'Completed', variant: 'info' as const },
}

const regStatusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'success' as const },
  CANCELED: { label: 'Canceled', variant: 'secondary' as const },
  ATTENDED: { label: 'Attended', variant: 'info' as const },
  NO_SHOW: { label: 'No Show', variant: 'destructive' as const },
  WAITLISTED: { label: 'Waitlisted', variant: 'warning' as const },
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [eventResult, membersResult] = await Promise.all([
    getEvent(id),
    getMembers({ status: 'ACTIVE' }),
  ])

  if (!eventResult.success || !eventResult.data) notFound()
  const event = eventResult.data
  const allMembers = membersResult.data ?? []

  const status = statusConfig[event.status]
  const registeredIds = new Set(
    event.registrations
      .filter((r) => r.status !== 'CANCELED')
      .map((r) => r.memberId)
  )
  const unregisteredMembers = allMembers.filter((m) => !registeredIds.has(m.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/events/${event.id}/checkin`}>
            <QrCode className="h-4 w-4" />
            Check-In
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDateTime(event.startDate)}</span>
                {event.endDate && (
                  <span className="text-muted-foreground">
                    → {formatDateTime(event.endDate)}
                  </span>
                )}
              </div>
              {event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.virtualLink && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={event.virtualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Join Virtual Event
                  </a>
                </div>
              )}
              {event.capacity && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {event._count.registrations}/{event.capacity} registered
                  </span>
                </div>
              )}
              {event.priceCents > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{formatCurrency(event.priceCents)}</span>
                </div>
              )}
              {event.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                  {event.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Registrations list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Registrations ({event._count.registrations})
                </CardTitle>
                {event.registrations.length > 0 && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/events/${event.id}/export-csv`} download>
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {event.registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No registrations yet
                </p>
              ) : (
                <div className="space-y-2">
                  {event.registrations.map((reg) => {
                    const regStatus = regStatusConfig[reg.status]
                    return (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reg.member.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                              {initials(reg.member.firstName, reg.member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/dashboard/members/${reg.member.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {reg.member.firstName} {reg.member.lastName}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {reg.member.email}
                            </p>
                          </div>
                        </div>
                        <Badge variant={regStatus.variant}>{regStatus.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add registration panel */}
        <div>
          <EventRegistrationPanel
            eventId={event.id}
            members={unregisteredMembers}
          />
        </div>
      </div>
    </div>
  )
}
