import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Clock } from 'lucide-react'
import { getEmailCampaign } from '@/lib/actions/communications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

const statusConfig = {
  DRAFT:     { label: 'Draft',     variant: 'secondary' as const },
  SCHEDULED: { label: 'Scheduled', variant: 'warning'   as const },
  SENDING:   { label: 'Sending',   variant: 'info'      as const },
  SENT:      { label: 'Sent',      variant: 'success'   as const },
  FAILED:    { label: 'Failed',    variant: 'destructive' as const },
}

export const metadata: Metadata = { title: 'Campaign Detail' }

export default async function EmailCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getEmailCampaign(id)
  if (!result.success || !result.data) notFound()
  const campaign = result.data
  const status = statusConfig[campaign.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/communications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
        <Button asChild variant="outline">
          <Link href={`/dashboard/communications/${campaign.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Recipients</p>
              <p className="font-semibold">{campaign.recipientCount}</p>
            </div>
            {campaign.sentAt && (
              <div className="text-sm">
                <p className="text-muted-foreground">Sent</p>
                <p className="font-semibold">{formatDate(campaign.sentAt)}</p>
              </div>
            )}
            <div className="text-sm">
              <p className="text-muted-foreground">Created</p>
              <p className="font-semibold">{formatDate(campaign.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none break-words" dangerouslySetInnerHTML={{ __html: campaign.htmlBody }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">Send Log</CardTitle>
          <span className="text-sm text-muted-foreground">{campaign.logs.length} entries</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaign.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails sent yet for this campaign.</p>
          ) : (
            <div className="space-y-3">
              {campaign.logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{log.email}</p>
                      <p className="text-xs text-muted-foreground">{log.status}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(log.sentAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
