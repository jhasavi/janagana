import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Clock, FileEdit } from 'lucide-react'
import { getEmailCampaign, previewCampaignAudience } from '@/lib/actions/communications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { SendCampaignButton } from './_components/send-campaign-button'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

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
  const tenant = await requireTenant()
  const targetTierNames = campaign.targetTierIds.length > 0
    ? await prisma.membershipTier.findMany({
        where: { tenantId: tenant.id, id: { in: campaign.targetTierIds } },
        select: { id: true, name: true },
      })
    : []
  const status = statusConfig[campaign.status]
  const canSend = campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED'

  const audienceResult = canSend
    ? await previewCampaignAudience({
        targetTierIds: campaign.targetTierIds,
        targetStatuses: campaign.targetStatuses,
      })
    : { data: campaign.recipientCount }
  const audienceCount = audienceResult.data ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/communications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
        </div>
        {canSend && (
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/communications/${campaign.id}/edit`}>
                <FileEdit className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <SendCampaignButton campaignId={campaign.id} recipientPreview={audienceCount} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Audience</p>
              <p className="font-semibold">{audienceCount} members</p>
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
            {(campaign.targetTierIds.length > 0 || campaign.targetStatuses.length > 0) && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Filters</p>
                <div className="flex flex-wrap gap-1">
                  {targetTierNames.map((tier) => (
                    <Badge key={tier.id} variant="secondary" className="text-xs">Tier: {tier.name}</Badge>
                  ))}
                  {campaign.targetStatuses.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={campaign.htmlBody}
                className="w-full h-96"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            </div>
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



