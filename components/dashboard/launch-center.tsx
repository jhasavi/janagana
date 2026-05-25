import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  HeartHandshake,
  KeyRound,
  LifeBuoy,
  Mail,
  Rocket,
  Users,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { getStripeSetupReadiness } from '@/lib/actions/stripe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'


type LaunchItem = {
  id: string
  label: string
  description: string
  done: boolean
  href: string
  cta: string
  doneCta?: string
  critical?: boolean
  icon: React.ElementType
}

function scoreLaunch(items: LaunchItem[]) {
  const total = items.reduce((sum, item) => sum + (item.critical ? 2 : 1), 0)
  const done = items.reduce((sum, item) => sum + (item.done ? (item.critical ? 2 : 1) : 0), 0)
  return Math.round((done / total) * 100)
}

export async function LaunchCenter() {
  try {
    const tenant = await getTenant()
    if (!tenant) return null

    const [
      memberCount,
      eventCount,
      tierCount,
      paidTierCount,
      apiKeyCount,
      activeCampaignCount,
      supportRequestCount,
      stripeResult,
    ] = await Promise.all([
      prisma.member.count({ where: { tenantId: tenant.id } }),
      prisma.event.count({ where: { tenantId: tenant.id } }),
      prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
      prisma.membershipTier.count({
        where: { tenantId: tenant.id, priceCents: { gt: 0 }, stripePriceId: { not: null }, isActive: true },
      }),
      prisma.apiKey.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.donationCampaign.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }).catch(() => 0),
      prisma.supportRequest.count({ where: { tenantId: tenant.id } }).catch(() => 0),
      getStripeSetupReadiness(),
    ])

    const stripeWarnings = stripeResult.success ? stripeResult.warnings : []
    const stripeErrors = stripeWarnings.filter((warning) => warning.severity === 'warning')
    const stripeInfos = stripeWarnings.filter((warning) => warning.severity === 'info')
    const stripeReady = stripeErrors.length === 0 && stripeInfos.length === 0
    const emailReady = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim())
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
    const fundraisingUrl = appBaseUrl ? `${appBaseUrl}/fundraising/${tenant.slug}` : `/fundraising/${tenant.slug}`

    const items: LaunchItem[] = [
      {
        id: 'profile',
        label: 'Organization profile',
        description: tenant.slug ? `Public slug is ${tenant.slug}.` : 'Add a public organization slug.',
        done: Boolean(tenant.name && tenant.slug && tenant.timezone),
        href: '/dashboard/settings',
        cta: 'Review settings',
        doneCta: 'Open settings',
        critical: true,
        icon: Rocket,
      },
      {
        id: 'tiers',
        label: 'Membership tiers',
        description: 'Create the plans members can join, renew, or upgrade.',
        done: tierCount > 0,
        href: '/dashboard/tiers/new',
        cta: 'Add tier',
        doneCta: 'Manage tiers',
        critical: true,
        icon: CreditCard,
      },
      {
        id: 'members',
        label: 'First members',
        description: 'Add or import members so the CRM starts with real people.',
        done: memberCount > 0,
        href: '/dashboard/members/new',
        cta: 'Add member',
        doneCta: 'Open members',
        critical: true,
        icon: Users,
      },
      {
        id: 'events',
        label: 'First event',
        description: 'Publish an event so members have an immediate self-service action.',
        done: eventCount > 0,
        href: '/dashboard/events/new',
        cta: 'Create event',
        doneCta: 'Open events',
        critical: true,
        icon: CalendarDays,
      },
      {
        id: 'portal',
        label: 'Member portal',
        description: 'Embed the portal so members can manage profiles, events, donations, and support.',
        done: apiKeyCount > 0,
        href: '/dashboard/integrations#install-script',
        cta: 'Configure portal',
        doneCta: 'Open portal setup',
        critical: true,
        icon: KeyRound,
      },
      {
        id: 'stripe',
        label: 'Payment confidence',
        description: stripeReady ? 'Stripe environment and paid tier setup are ready.' : 'Review Stripe readiness before accepting paid registrations.',
        done: stripeReady || paidTierCount > 0,
        href: '/dashboard/launch',
        cta: 'Review payments',
        doneCta: 'Open launch checks',
        critical: true,
        icon: CreditCard,
      },
      {
        id: 'support',
        label: 'Support loop',
        description: supportRequestCount > 0 ? 'Support reporting is receiving requests.' : 'Support reporting is available for members and admins.',
        done: true,
        href: '/dashboard/support',
        cta: 'View support',
        doneCta: 'Open support',
        critical: true,
        icon: LifeBuoy,
      },
      {
        id: 'email',
        label: 'Email delivery',
        description: emailReady ? 'Email sender is configured for receipts and confirmations.' : 'Verify Resend and EMAIL_FROM so members receive confirmations.',
        done: emailReady,
        href: '/dashboard/launch',
        cta: 'Review email',
        doneCta: 'Open launch checks',
        critical: true,
        icon: Mail,
      },
      {
        id: 'fundraising',
        label: 'Fundraising page',
        description: activeCampaignCount > 0 ? 'Public campaign pages are live.' : 'Activate a campaign to collect public donations.',
        done: activeCampaignCount > 0,
        href: '/dashboard/fundraising',
        cta: 'Create campaign',
        doneCta: 'Open fundraising',
        icon: HeartHandshake,
      },
      {
        id: 'brand',
        label: 'Branding',
        description: 'Add a logo so the portal and emails feel like your organization.',
        done: Boolean(tenant.logoUrl),
        href: '/dashboard/settings',
        cta: 'Add logo',
        doneCta: 'Open branding',
        icon: CheckCircle2,
      },
    ]

    const launchScore = scoreLaunch(items)
    const nextItems = items.filter((item) => !item.done).slice(0, 4)
    const criticalOpen = items.filter((item) => item.critical && !item.done).length
    const statusLabel = criticalOpen === 0 ? 'All core setup items complete' : `${criticalOpen} setup items pending`

    return (
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-indigo-600" />
                <CardTitle>Launch Center</CardTitle>
                <Badge variant={criticalOpen === 0 ? 'success' : 'warning'}>{statusLabel}</Badge>
              </div>
              <CardDescription className="mt-1">
                Use this as your setup checklist before inviting members.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-700">{launchScore}%</p>
                  <p className="text-xs text-muted-foreground">setup completion</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${launchScore}%` }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {stripeErrors.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Payment setup needs attention</p>
                  <p className="mt-1 text-amber-800">{stripeErrors[0].message}</p>
                </div>
              </div>
            </div>
          ) : stripeInfos.length > 0 ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Stripe setup guidance</p>
                  <p className="mt-1 text-sky-800">{stripeInfos[0].message}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3 transition-colors hover:bg-muted/30"
                  data-testid={`launch-center-item-${item.id}`}
                  aria-label={`${item.label}: ${item.done ? (item.doneCta ?? 'Open') : item.cta}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={item.done ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        <Badge variant={item.done ? 'success' : 'warning'}>
                          {item.done ? 'Complete' : 'Setup required'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-muted-foreground" data-testid={`launch-center-cta-${item.id}`}>
                    {item.done ? (item.doneCta ?? 'Open') : item.cta}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Public URLs</p>
              <p className="text-xs text-muted-foreground">Use these to inspect the member and donor experience.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/portal/${tenant.slug}`} target="_blank" data-testid="member-portal-public-url">
                  Member portal <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={fundraisingUrl} target="_blank">
                  Fundraising <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {nextItems.length > 0 ? (
            <div className="rounded-lg bg-white p-3 text-sm">
              <p className="font-medium">Fastest path to 9/10</p>
              <p className="mt-1 text-muted-foreground">
                Finish {nextItems.map((item) => item.label.toLowerCase()).join(', ')} next.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('[LaunchCenter]', error)
    return null
  }
}
