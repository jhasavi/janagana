'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, Users, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEvent, publishEvent } from '@/lib/actions/events'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import type { Event } from '@prisma/client'

type EventWithCount = Event & { _count: { registrations: number } }

const statusConfig = {
  DRAFT: { label: 'Draft', variant: 'secondary' as const },
  PUBLISHED: { label: 'Published', variant: 'success' as const },
  CANCELED: { label: 'Canceled', variant: 'destructive' as const },
  COMPLETED: { label: 'Completed', variant: 'info' as const },
}

const formatConfig = {
  IN_PERSON: { label: 'In Person', icon: Users },
  VIRTUAL: { label: 'Virtual', icon: Globe },
  HYBRID: { label: 'Hybrid', icon: Globe },
}

interface EventGridProps {
  events: EventWithCount[]
}

export function EventGrid({ events }: EventGridProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteEvent(deleteId)
      if (result.success) {
        toast.success('Event deleted')
        setDeleteId(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  const handlePublish = (id: string) => {
    startTransition(async () => {
      const result = await publishEvent(id)
      if (result.success) {
        toast.success('Event published')
      } else {
        toast.error(result.error)
      }
    })
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">📅</span>
        </div>
        <h3 className="font-semibold text-lg mb-1">No events yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Create your first event to get started.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/events/new">Create Event</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const status = statusConfig[event.status]
          const fmt = formatConfig[event.format]
          const FmtIcon = fmt.icon

          return (
            <Card key={event.id} className="group hover:shadow-md transition-shadow overflow-hidden">
              {event.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.coverImageUrl}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="h-36 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-4xl">📅</span>
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="font-semibold text-sm leading-tight line-clamp-2 hover:underline block"
                    >
                      {event.title}
                    </Link>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/events/${event.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {event.status === 'DRAFT' && (
                        <DropdownMenuItem onClick={() => handlePublish(event.id)}>
                          <Globe className="h-4 w-4" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.startDate)}
                </p>

                {event.location && (
                  <p className="text-xs text-muted-foreground truncate">
                    📍 {event.location}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <FmtIcon className="h-3 w-3 mr-1" />
                      {fmt.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {event._count.registrations}
                    {event.capacity && `/${event.capacity}`}
                  </div>
                </div>

                {event.priceCents > 0 && (
                  <p className="text-sm font-semibold text-indigo-600">
                    {formatCurrency(event.priceCents)}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? All registrations for this event will also be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
