import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Target, DollarSign, TrendingUp } from 'lucide-react'
import { getCampaigns } from '@/lib/actions/fundraising'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Fundraising' }

const statusConfig = {
  DRAFT:  { label: 'Draft',  variant: 'secondary' as const },
  ACTIVE: { label: 'Active', variant: 'success'   as const },
  PAUSED: { label: 'Paused', variant: 'warning'   as const },
  ENDED:  { label: 'Ended',  variant: 'info'      as const },
}

export default async function FundraisingPage() {
  const result = await getCampaigns()
  const campaigns = result.data ?? []

  const totalRaised = campaigns.reduce((s, c) => s + c.raisedCents, 0)
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fundraising</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage donation campaigns and track progress.
            </p>
          </div>
          <HelpButton
            title="Fundraising Campaigns"
            content="Create donation campaigns to raise funds for your organization. Track donations, set goals, and view campaign progress. Donations can be made through the portal or embedded widgets."
            link="/dashboard/help/fundraising/create-donation-campaign"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/fundraising/new">
            <Plus className="h-4 w-4" /> New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-500" />
            <div>
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <div className="text-xs text-muted-foreground">Total Campaigns</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{activeCampaigns}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(totalRaised)}</div>
              <div className="text-xs text-muted-foreground">Total Raised</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Target className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No campaigns yet. Start your first fundraising campaign.</p>
            <Button asChild>
              <Link href="/dashboard/fundraising/new">Create Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status]
            const pct = campaign.goalCents > 0
              ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
              : 0

            return (
              <Link key={campaign.id} href={`/dashboard/fundraising/${campaign.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{campaign.title}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                    {/* Progress bar */}
                    {campaign.goalCents > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(campaign.raisedCents)} raised</span>
                          <span>{pct}% of {formatCurrency(campaign.goalCents)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{campaign._count.donations} donations</span>
                      {campaign.endDate && <span>Ends {formatDate(campaign.endDate)}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
