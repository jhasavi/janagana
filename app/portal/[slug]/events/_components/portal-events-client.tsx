'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, MapPin, Users, DollarSign, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { portalRegisterForEvent } from '@/lib/actions/portal'
import { formatDateTime, formatCurrency } from '@/lib/utils'

type Event = {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date | null
  location: string | null
  priceCents: number
  capacity: number | null
  _count: { registrations: number }
}

interface PortalEventsClientProps {
  events: Event[]
  registeredEventIds: string[]
  waitlistedEventIds?: string[]
  slug: string
}

export function PortalEventsClient({ events, registeredEventIds: initial, waitlistedEventIds: initialWl = [], slug }: PortalEventsClientProps) {
  const [registered, setRegistered] = useState(new Set(initial))
  const [waitlisted, setWaitlisted] = useState(new Set(initialWl))
  const [isPending, startTransition] = useTransition()

  function handleRegister(eventId: string, joinWaitlist = false) {
    startTransition(async () => {
      const res = await portalRegisterForEvent(slug, eventId, joinWaitlist)
      if (res.success) {
        if ('waitlisted' in res && res.waitlisted) {
          setWaitlisted((prev) => new Set([...prev, eventId]))
          toast.success('Added to waitlist! You\'ll be notified if a spot opens up.')
        } else {
          setRegistered((prev) => new Set([...prev, eventId]))
          toast.success('Registered successfully!')
        }
      } else if ('waitlistAvailable' in res && res.waitlistAvailable) {
        toast('This event is full.', {
          description: 'Would you like to join the waitlist?',
          action: {
            label: 'Join Waitlist',
            onClick: () => handleRegister(eventId, true),
          },
        })
      } else {
        toast.error(res.error ?? 'Registration failed')
      }
    })
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No upcoming events at this time.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const isRegistered = registered.has(event.id)
        const isWaitlisted = waitlisted.has(event.id)
        const isFull = event.capacity != null && event._count.registrations >= event.capacity

        return (
          <Card key={event.id} id={`event-${event.id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event._count.registrations}/{event.capacity} spots filled
                      </span>
                    )}
                    {event.priceCents > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(event.priceCents)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {isRegistered ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Registered
                    </Badge>
                  ) : isWaitlisted ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> Waitlisted
                    </Badge>
                  ) : isFull ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegister(event.id, true)}
                      disabled={isPending}
                    >
                      Join Waitlist
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRegister(event.id)}
                      disabled={isPending}
                    >
                      Register
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
