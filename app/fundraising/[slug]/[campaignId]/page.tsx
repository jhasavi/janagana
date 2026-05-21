import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, HeartHandshake } from 'lucide-react'
import { getPublicCampaign } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PublicDonationForm } from './_components/public-donation-form'

export default async function PublicCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; campaignId: string }>
  searchParams: Promise<{ donation?: string }>
}) {
  const [{ slug, campaignId }, query] = await Promise.all([params, searchParams])
  const result = await getPublicCampaign(slug, campaignId)
  if (!result.success || !result.data) notFound()

  const { tenant, campaign } = result.data
  const percent = campaign.goalCents > 0
    ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
    : 0

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/fundraising/${tenant.slug}`}>
              <ArrowLeft className="h-4 w-4" /> All campaigns
            </Link>
          </Button>

          {query.donation === 'success' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium">Thank you for your donation.</p>
                  <p className="mt-1">A receipt will be emailed after payment confirmation.</p>
                </div>
              </div>
            </div>
          ) : null}

          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Active campaign</Badge>
                {campaign.endDate ? <Badge variant="outline">Ends {formatDate(campaign.endDate)}</Badge> : null}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <HeartHandshake className="h-4 w-4" />
                  {tenant.name}
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{campaign.title}</h1>
                {campaign.description ? (
                  <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{campaign.description}</p>
                ) : null}
              </div>

              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Raised</p>
                    <p className="text-3xl font-bold text-emerald-700">{formatCurrency(campaign.raisedCents)}</p>
                  </div>
                  {campaign.goalCents > 0 ? (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Goal</p>
                      <p className="font-semibold">{formatCurrency(campaign.goalCents)}</p>
                    </div>
                  ) : null}
                </div>
                {campaign.goalCents > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="h-3 overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{percent}% funded by {campaign._count.donations} donations</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">{campaign._count.donations} donations so far</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <PublicDonationForm slug={tenant.slug} campaignId={campaign.id} />
        </div>
      </div>
    </main>
  )
}
