import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, DollarSign, Users } from 'lucide-react'
import { getCampaign } from '@/lib/actions/fundraising'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RecordDonationPanel } from './_components/record-donation-panel'

export const metadata: Metadata = { title: 'Campaign Detail' }

const statusConfig = {
  DRAFT:  { label: 'Draft',  variant: 'secondary' as const },
  ACTIVE: { label: 'Active', variant: 'success'   as const },
  PAUSED: { label: 'Paused', variant: 'warning'   as const },
  ENDED:  { label: 'Ended',  variant: 'info'      as const },
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getCampaign(id)
  if (!result.success || !result.data) notFound()
  const campaign = result.data
  const status = statusConfig[campaign.status]
  const pct = campaign.goalCents > 0
    ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/fundraising"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/fundraising/${id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader><CardTitle className="text-base">Campaign Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(campaign.raisedCents)}
                </span>
                <span className="text-muted-foreground">
                  of {formatCurrency(campaign.goalCents)} goal
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Donations</p>
                  <p className="font-semibold">{campaign._count.donations}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-semibold">{pct}%</p>
                </div>
                {campaign.endDate && (
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-semibold">{formatDate(campaign.endDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Donations list */}
          <Card>
            <CardHeader><CardTitle className="text-base">Donations</CardTitle></CardHeader>
            <CardContent className="p-0">
              {campaign.donations.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No donations yet.</p>
              ) : (
                <div className="divide-y">
                  {campaign.donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {d.isAnonymous ? 'Anonymous' : d.donorName}
                        </p>
                        {!d.isAnonymous && (
                          <p className="text-xs text-muted-foreground">{d.donorEmail}</p>
                        )}
                        {d.message && (
                          <p className="text-xs text-muted-foreground italic">&quot;{d.message}&quot;</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">{formatCurrency(d.amountCents)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <RecordDonationPanel campaignId={campaign.id} />
        </div>
      </div>
    </div>
  )
}
