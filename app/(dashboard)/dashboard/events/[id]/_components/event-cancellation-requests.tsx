'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateEventCancellationRequestStatus } from '@/lib/actions/events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

interface RequestItem {
  id: string
  status: string
  reason: string | null
  createdAt: Date
  stripePaymentId: string | null
  refundId?: string | null
  refundStatus?: string | null
  member: { firstName: string; lastName: string; email: string }
}

interface EventCancellationRequestsPanelProps {
  requests: RequestItem[]
}

const statusVariant = (status: string) => {
  if (status === 'REQUESTED') return 'warning'
  if (status === 'APPROVED') return 'secondary'
  if (status === 'REJECTED') return 'destructive'
  if (status === 'REFUNDED') return 'success'
  return 'secondary'
}

export function EventCancellationRequestsPanel({ requests }: EventCancellationRequestsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (id: string, status: 'APPROVED' | 'REJECTED' | 'REFUNDED') => {
    startTransition(async () => {
      const result = await updateEventCancellationRequestStatus(id, status)
      if (result.success) {
        toast.success('Cancellation request updated')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Unable to update request')
      }
    })
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cancellation requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {request.member.firstName} {request.member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.member.email}
                </p>
              </div>
              <Badge variant={statusVariant(request.status)} className="capitalize">
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {request.reason ?? 'Cancellation requested for a paid registration.'}
            </p>
            {request.refundStatus && (
              <p className="mt-2 text-xs text-muted-foreground">
                Refund status: {request.refundStatus}{request.refundId ? ` (${request.refundId})` : ''}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Requested {formatDateTime(new Date(request.createdAt))}</p>
            <div className="mt-4 flex flex-wrap gap-2">
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
        ))}
      </CardContent>
    </Card>
  )
}
