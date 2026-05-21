import { notFound } from 'next/navigation'
import { getMemberSupportRequests } from '@/lib/actions/support'
import { getPortalContext } from '@/lib/actions/portal'
import { SupportRequestForm } from '@/components/help/support-request-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function PortalSupportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  const supportResult = await getMemberSupportRequests(ctx.member.email, ctx.tenant.id)
  const requests = supportResult.success ? supportResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report an issue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Need help with the member portal? Tell us what happened and we&apos;ll follow up.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your recent support requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">You haven&apos;t submitted any support requests yet.</p>
                  <p className="mt-3 text-sm text-muted-foreground">Use the form to report an issue and track status here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{request.context ?? 'Portal support'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(request.createdAt)}</p>
                        </div>
                        <Badge variant={request.status === 'open' ? 'destructive' : request.status === 'in_progress' ? 'warning' : 'success'} className="capitalize">
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{request.message}</p>
                      {request.comments?.[0] ? (
                        <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                          <p className="font-medium">Latest response</p>
                          <p className="mt-1 whitespace-pre-wrap">{request.comments[0].body}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SupportRequestForm contextLabel={`portal:${ctx.tenant.slug}`} />
        </div>
      </div>
    </div>
  )
}
