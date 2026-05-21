import { Metadata } from 'next'
import Link from 'next/link'
import Stripe from 'stripe'
import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Launch Readiness' }

const STATUS = {
  ok: { label: 'Ready', variant: 'success' as const },
  warning: { label: 'Warning', variant: 'warning' as const },
  error: { label: 'Missing', variant: 'destructive' as const },
}

type CheckItem = {
  label: string
  description: string
  status: keyof typeof STATUS
  detail?: string
  learnMore?: string
  href?: string
}

async function getStripeHealth() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return { status: 'error' as const, detail: 'STRIPE_SECRET_KEY not configured' }
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' })
    await stripe.accounts.retrieve()
    return { status: 'ok' as const, detail: 'Stripe credentials are valid' }
  } catch (error) {
    return { status: 'warning' as const, detail: 'Stripe key is configured but returned an error' }
  }
}

async function getReadinessChecks() {
  const tenant = await getTenant()
  if (!tenant) return null

  const [tierCount, memberCount, eventCount] = await Promise.all([
    prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
    prisma.member.count({ where: { tenantId: tenant.id } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
  ])

  const tests: CheckItem[] = []

  const stripeHealth = await getStripeHealth()
  tests.push({
    label: 'Stripe API key',
    description: 'Verify your Stripe secret key can authenticate successfully.',
    status: stripeHealth.status,
    detail: stripeHealth.detail,
    href: '/dashboard/settings#stripe',
  })

  tests.push({
    label: 'Stripe webhook',
    description: 'Confirm your Stripe webhook secret is configured for payment events.',
    status: process.env.STRIPE_WEBHOOK_SECRET ? 'ok' : 'error',
    detail: process.env.STRIPE_WEBHOOK_SECRET ? 'Webhook secret configured' : 'Set STRIPE_WEBHOOK_SECRET',
    href: '/dashboard/settings',
  })

  tests.push({
    label: 'Email delivery',
    description: 'Ensure transactional email is enabled for receipts and confirmations.',
    status: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? 'ok' : 'error',
    detail: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? 'Resend email configured' : 'Set RESEND_API_KEY and EMAIL_FROM',
    href: '/dashboard/settings',
  })

  tests.push({
    label: 'Authentication',
    description: 'Clerk is configured to allow member sign-in to the portal.',
    status: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'ok' : 'error',
    detail: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Clerk publishable key present' : 'Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    href: '/dashboard/settings',
  })

  tests.push({
    label: 'Tenant branding',
    description: 'Add a logo so your portal and emails look polished.',
    status: tenant.logoUrl ? 'ok' : 'warning',
    detail: tenant.logoUrl ? 'Logo uploaded' : 'Upload a logo for your organization',
    href: '/dashboard/settings',
  })

  tests.push({
    label: 'Membership tiers',
    description: 'Create at least one membership tier for member sign-up and billing.',
    status: tierCount > 0 ? 'ok' : 'warning',
    detail: tierCount > 0 ? `${tierCount} active tier(s)` : 'Add a membership tier',
    href: '/dashboard/tiers/new',
  })

  tests.push({
    label: 'Members',
    description: 'Add at least one member to start your community.',
    status: memberCount > 0 ? 'ok' : 'warning',
    detail: memberCount > 0 ? `${memberCount} member(s)` : 'Add your first member',
    href: '/dashboard/members/new',
  })

  tests.push({
    label: 'Events',
    description: 'Create an event so members can register and engage.',
    status: eventCount > 0 ? 'ok' : 'warning',
    detail: eventCount > 0 ? `${eventCount} event(s)` : 'Create your first event',
    href: '/dashboard/events/new',
  })

  return { tenant, tests }
}

export default async function LaunchReadinessPage() {
  const checks = await getReadinessChecks()
  if (!checks) return null

  const readyCount = checks.tests.filter((test) => test.status === 'ok').length
  const totalCount = checks.tests.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Launch readiness</p>
            <h1 className="text-3xl font-semibold">One-hour launch center</h1>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Validate your payment, email, webhook, and tenant setup in one place so your portal can go live with confidence.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Readiness checklist</CardTitle>
            <CardDescription>{readyCount}/{totalCount} checks passed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.tests.map((check) => (
              <div key={check.label} className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{check.label}</p>
                  <p className="text-sm text-muted-foreground">{check.description}</p>
                  {check.detail ? <p className="mt-2 text-xs text-muted-foreground">{check.detail}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS[check.status].variant}>{STATUS[check.status].label}</Badge>
                  {check.href ? (
                    <Link href={check.href} className="text-sm text-primary underline underline-offset-4">
                      Fix it
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Launch status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-muted-foreground">Recommended next step</p>
              <p className="mt-2 text-base font-semibold">Verify your Stripe webhook and email settings before launch.</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/dashboard/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
