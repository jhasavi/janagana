import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { getPendingCancellationRequests } from '@/lib/actions/events'
import { PendingCancellationRequestsPanel } from './_components/pending-cancel-requests-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Pending Cancellation Requests' }

export default async function PendingCancellationRequestsPage() {
  const result = await getPendingCancellationRequests()
  const requests = result.success
    ? result.data.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Cancellation Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review paid event cancellation and refund requests submitted by members.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/events">
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Requests are created when members request a refund for a paid event registration. Use the actions below to approve, reject, or mark the refund completed.
          </p>
        </CardContent>
      </Card>

      <PendingCancellationRequestsPanel requests={requests} />
    </div>
  )
}
