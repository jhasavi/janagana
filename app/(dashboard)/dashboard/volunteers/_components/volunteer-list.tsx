'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, MapPin, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { deleteOpportunity } from '@/lib/actions/volunteers'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import type { VolunteerOpportunity } from '@prisma/client'

type OpportunityWithCount = VolunteerOpportunity & {
  _count: { signups: number }
}

const statusConfig = {
  OPEN: { label: 'Open', variant: 'success' as const },
  CLOSED: { label: 'Closed', variant: 'secondary' as const },
  COMPLETED: { label: 'Completed', variant: 'info' as const },
  CANCELED: { label: 'Canceled', variant: 'destructive' as const },
}

interface VolunteerListProps {
  opportunities: OpportunityWithCount[]
}

export function VolunteerList({ opportunities }: VolunteerListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteOpportunity(deleteId)
      if (result.success) {
        toast.success('Opportunity deleted')
        setDeleteId(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🤝</span>
        </div>
        <h3 className="font-semibold text-lg mb-1">No volunteer opportunities</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Create your first opportunity to start engaging volunteers.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/volunteers/new">New Opportunity</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opp) => {
          const status = statusConfig[opp.status]
          return (
            <Card key={opp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/volunteers/${opp.id}`}
                      className="font-semibold text-sm leading-tight line-clamp-2 hover:underline block"
                    >
                      {opp.title}
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
                        <Link href={`/dashboard/volunteers/${opp.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/volunteers/${opp.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(opp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {opp.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {opp.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  {opp.date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(opp.date)}
                    </div>
                  )}
                  {opp.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{opp.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {opp._count.signups}
                    {opp.capacity && `/${opp.capacity}`}
                    {opp.hoursEstimate && (
                      <span className="ml-1">· {opp.hoursEstimate}h est.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Opportunity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? All volunteer signups for this opportunity will also be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
