import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Gift, CalendarCheck } from 'lucide-react'
import { getPortalContext } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PortalDonationHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  const { member, tenant } = ctx
  const donations = await prisma.donation.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { memberId: member.id },
        { donorEmail: member.email },
      ],
    },
    include: {
      campaign: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalRaised = donations.reduce((sum, donation) => sum + donation.amountCents, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/portal/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Giving history</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your donations and view campaign support history.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Donation summary</CardTitle>
                  <CardDescription>All giving linked to your account and email.</CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {donations.length} donations
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-muted-foreground">Total donated</p>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(totalRaised)}</p>
              </div>
            </CardContent>
          </Card>

          {donations.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <DollarSign className="mx-auto h-10 w-10 text-slate-400" />
                <h2 className="mt-4 text-lg font-semibold">No donations yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Give to a campaign to see your history here.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href={`/fundraising/${tenant.slug}`}>Browse campaigns</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {donations.map((donation) => (
                <Card key={donation.id}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{donation.isAnonymous ? 'Anonymous donation' : donation.donorName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {donation.campaign?.title ?? 'General support'} · {formatDate(donation.createdAt)}
                        </p>
                        {donation.message && (
                          <p className="mt-3 text-sm text-muted-foreground italic">“{donation.message}”</p>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2 text-right sm:items-end">
                        <p className="text-lg font-semibold">{formatCurrency(donation.amountCents)}</p>
                        <Badge variant={donation.status === 'COMPLETED' ? 'success' : 'secondary'}>
                          {donation.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-600" />
                Giving insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Most recent donation</p>
                <p className="font-semibold">
                  {donations[0] ? formatCurrency(donations[0].amountCents) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Favorite campaign</p>
                <p className="font-semibold">
                  {donations[0]?.campaign?.title ?? 'No campaign yet'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giving since</p>
                <p className="font-semibold">
                  {donations[donations.length - 1]
                    ? formatDate(donations[donations.length - 1].createdAt)
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Take action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">Want to support another campaign?</p>
                <Button asChild className="mt-3" variant="secondary">
                  <Link href={`/fundraising/${tenant.slug}`}>Give again</Link>
                </Button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">Need a donation receipt?</p>
                <p className="mt-2 text-sm text-slate-700">Contact your organization admin to resend a receipt for completed donations.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
