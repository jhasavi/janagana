'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateEventCancellationRequestStatus } from '@/lib/actions/events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

interface RequestItem {
  id: string
  status: string
  reason: string | null
  createdAt: string
  event: { id: string; title: string }
  member: { firstName: string; lastName: string; email: string }
}

interface PendingCancellationRequestsPanelProps {
  requests: RequestItem[]
}

const statusVariant = (status: string) => {
  if (status === 'REQUESTED') return 'warning'
  if (status === 'APPROVED') return 'secondary'
  if (status === 'REJECTED') return 'destructive'
  if (status === 'REFUNDED') return 'success'
  return 'secondary'
}

export function PendingCancellationRequestsPanel({ requests }: PendingCancellationRequestsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (id: string, status: 'APPROVED' | 'REJECTED' | 'REFUNDED') => {
    startTransition(async () => {
      const result = await updateEventCancellationRequestStatus(id, status)
      if (result.success) {
        toast.success('Request updated successfully.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Unable to update request')
      }
    })
  }

  if (!requests.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CardTitle className="text-base">No pending requests</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            There are currently no paid event cancellation requests awaiting review.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{request.event.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.member.firstName} {request.member.lastName} · {request.member.email}
                </p>
              </div>
              <Badge variant={statusVariant(request.status)} className="capitalize">
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {request.reason ?? 'No reason provided.'}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Requested {formatDateTime(new Date(request.createdAt))}</span>
              <div className="flex flex-wrap gap-2">
                {request.status === 'REQUESTED' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleUpdate(request.id, 'APPROVED')} disabled={isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleUpdate(request.id, 'REJECTED')} disabled={isPending}>
                      Reject
                    </Button>
                  </>
                )}
                {request.status === 'APPROVED' && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdate(request.id, 'REFUNDED')} disabled={isPending}>
                    Mark refunded
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
