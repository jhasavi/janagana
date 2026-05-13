import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreditCard, CheckCircle2, Star, CalendarDays, ArrowUpCircle } from 'lucide-react'
import { getPortalContext } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency } from '@/lib/utils'
import { BillingPortalCard } from './_components/billing-portal-card'

export default async function PortalMembershipPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  const { member, tenant } = ctx

  // Fetch all active tiers for this tenant (for upgrade CTA)
  const allTiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { priceCents: 'asc' },
    select: { id: true, name: true, priceCents: true, interval: true, description: true, benefits: true },
  })
  const otherTiers = allTiers.filter((t) => t.id !== member.tierId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Membership</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your membership plan and billing details.
        </p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.tier ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{member.tier.name}</p>
                  {member.tier.description && (
                    <p className="text-sm text-muted-foreground">{member.tier.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {member.tier.priceCents === 0
                      ? 'Free'
                      : `${formatCurrency(member.tier.priceCents)} / ${member.tier.interval === 'MONTHLY' ? 'mo' : 'yr'}`}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">{formatDate(member.joinedAt)}</p>
                </div>
                {member.renewsAt && (
                  <div>
                    <p className="text-muted-foreground">Next renewal</p>
                    <p className="font-medium">{formatDate(member.renewsAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={member.status === 'ACTIVE' ? 'success' : 'secondary'}
                    className="mt-0.5"
                  >
                    {member.status}
                  </Badge>
                </div>
              </div>
              {member.tier.priceCents > 0 && !member.stripeSubscriptionId && (
                <div className="mt-4">
                  <Link
                    href={`/portal/${slug}/membership/subscribe`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                  >
                    Subscribe Now
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No membership tier assigned. Contact your administrator.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      {member.tier && member.tier.benefits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Included Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.tier.benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event history */}
      {member.eventRegistrations && member.eventRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Event History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.eventRegistrations.slice(0, 5).map((reg) => (
              <div key={reg.id} className="flex items-center justify-between text-sm">
                <span>{reg.event?.title ?? 'Event'}</span>
                <Badge
                  variant={reg.status === 'ATTENDED' ? 'success' : 'secondary'}
                >
                  {reg.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {/* Billing Portal */}
      <BillingPortalCard slug={slug} hasSubscription={!!member.stripeCustomerId} />

      {/* Available Plans (Upgrade CTA) */}
      {otherTiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-indigo-500" />
              Available Plans
            </CardTitle>
            <CardDescription>Explore other membership options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold">{tier.name}</p>
                  {tier.description && (
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  )}
                  {tier.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tier.benefits.slice(0, 3).map((b, i) => (
                        <span key={i} className="text-xs flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />{b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4 space-y-1.5">
                  <p className="font-bold text-sm">
                    {tier.priceCents === 0
                      ? 'Free'
                      : `${formatCurrency(tier.priceCents)}/${tier.interval === 'MONTHLY' ? 'mo' : 'yr'}`}
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/portal/${slug}/membership/subscribe?tier=${tier.id}`}>
                      Switch Plan
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
