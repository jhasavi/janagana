import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { getPublicCampaigns } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PublicFundraisingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getPublicCampaigns(slug)
  if (!result.success || !result.data) notFound()

  const { tenant, campaigns } = result.data

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HeartHandshake className="h-4 w-4" />
              Fundraising
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Support active campaigns and help this community keep moving.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/portal/${tenant.slug}`}>Member portal</Link>
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <HeartHandshake className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">No active campaigns are available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {campaigns.map((campaign) => {
              const percent = campaign.goalCents > 0
                ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
                : 0

              return (
                <Card key={campaign.id} className="h-full">
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{campaign.title}</h2>
                        {campaign.description ? (
                          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{campaign.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-emerald-700">{formatCurrency(campaign.raisedCents)}</span>
                        {campaign.goalCents > 0 ? (
                          <span className="text-muted-foreground">Goal {formatCurrency(campaign.goalCents)}</span>
                        ) : null}
                      </div>
                      {campaign.goalCents > 0 ? (
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{campaign._count.donations} donations</span>
                      {campaign.endDate ? <span>Ends {formatDate(campaign.endDate)}</span> : null}
                    </div>

                    <Button asChild className="w-full">
                      <Link href={`/fundraising/${tenant.slug}/${campaign.id}`}>
                        Donate <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
