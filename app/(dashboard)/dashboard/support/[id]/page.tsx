import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageSquare, User, Clock, CheckCircle2 } from 'lucide-react'
import { getSupportRequestDetail, addSupportRequestComment } from '@/lib/actions/support'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SupportStatusSelect } from '../_components/support-status-select'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const metadata: Metadata = { title: 'Support Request' }

async function addCommentAction(formData: FormData) {
  const requestId = formData.get('requestId')?.toString() ?? ''
  const body = formData.get('body')?.toString() ?? ''
  const isPublic = formData.get('isPublic') === 'on'

  await addSupportRequestComment(requestId, { body, isPublic })
}

export default async function SupportRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getSupportRequestDetail(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const request = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Request</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review the full request, update status, and add notes or a public response.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/support">
            <ArrowLeft className="h-4 w-4" /> Back to requests
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.75fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="capitalize">{request.status.replace('_', ' ')}</Badge>
                  <span className="text-sm text-muted-foreground">Submitted {formatDate(request.createdAt)}</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Requester</p>
                  <p>{request.name ?? 'Anonymous'}{request.email ? ` • ${request.email}` : ''}</p>
                </div>
                {request.context ? (
                  <div className="text-sm">
                    <p className="font-medium">Context</p>
                    <p className="text-muted-foreground">{request.context}</p>
                  </div>
                ) : null}
                <div className="text-sm">
                  <p className="font-medium">Message</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{request.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes or responses have been added yet.</p>
              ) : (
                <div className="space-y-4">
                  {request.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                          {comment.authorName ?? comment.authorType}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.body}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {comment.isPublic ? 'Visible to the requester' : 'Internal note'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Change the request status or add a note for other admins.</p>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                  <SupportStatusSelect id={request.id} currentStatus={request.status} />
                </div>
                <form action={addCommentAction} className="space-y-4">
                  <input type="hidden" name="requestId" value={request.id} />
                  <div className="space-y-1">
                    <Label htmlFor="comment-body">Add a note or response</Label>
                    <Textarea id="comment-body" name="body" rows={5} placeholder="Enter your response here." />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" name="isPublic" className="rounded border-input text-primary focus:ring-primary" />
                      Publish response to requester
                    </label>
                  </div>
                  <Button type="submit" className="w-full">Save response</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
