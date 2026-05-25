import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarDays, HeartHandshake, Users, Sparkles } from 'lucide-react'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = {
  title: 'Janagana — Membership, Events & CRM for Nonprofits',
  description:
    'Janagana helps nonprofits manage memberships, events, volunteers, fundraising, and communications in one easy platform.',
}

const features = [
  {
    title: 'Manage members with confidence',
    description: 'Track membership tiers, renewals, and household relationships from one clean CRM.',
    icon: Users,
  },
  {
    title: 'Run events and registrations',
    description: 'Create events, publish registration pages, and manage attendance in one place.',
    icon: CalendarDays,
  },
  {
    title: 'Fundraise and support donors',
    description: 'Launch campaigns, accept donations, and keep supporters connected.',
    icon: HeartHandshake,
  },
  {
    title: 'Launch quickly with integrations',
    description: 'Embed portal and event widgets, connect Stripe payments, and automate outreach.',
    icon: Sparkles,
  },
]

export default async function RootPage() {
  const identity = await getCurrentIdentity()

  if (identity.userId) {
    const memberships = await getUserOrgMemberships(identity.userId)
    if (memberships.length === 0) redirect('/onboarding')
    if (memberships.length > 1) redirect('/select-organization')
    redirect('/dashboard')
  }

  return (
    <main className="space-y-24 px-6 py-16 sm:px-8 lg:px-16">
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              <span>Nonprofit operations</span>
              <Badge variant="secondary">Launch faster</Badge>
            </div>
            <div className="space-y-6">
              <div className="max-w-3xl space-y-5">
                <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Built for membership, events, fundraising, and volunteer teams.
                </p>
                <p className="text-base text-muted-foreground sm:text-lg">
                  JanaGana combines CRM, event management, portal access, and payments so your nonprofit has one platform for members, donors, volunteers, and administrators.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/sign-in">Get started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/help">Help center</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">Fast setup</p>
                <p className="mt-3 text-lg font-semibold">Start with your first tier, event, or member in minutes.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">Integrated payments</p>
                <p className="mt-3 text-lg font-semibold">Stripe, email, and portal workflows are ready to connect.</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard preview</p>
                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Member growth, events, support, funding, and portal readiness — all in one view.
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border px-3 py-1">Members</span>
                    <span className="rounded-full border px-3 py-1">Events</span>
                    <span className="rounded-full border px-3 py-1">Support</span>
                    <span className="rounded-full border px-3 py-1">Integrations</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Active members</p>
                  <p className="mt-3 text-3xl font-semibold">82</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Upcoming events</p>
                  <p className="mt-3 text-3xl font-semibold">4</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl">
        <div className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">One platform for coordinated impact</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything your team needs to run memberships, events, fundraising, and volunteer coordination.</h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground">Operate with more clarity by centralizing member data, event pages, payment flow, and communications in a nonprofit-specific workflow.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="rounded-3xl border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="p-0">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-5 text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4 text-sm text-muted-foreground">{feature.description}</CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Why nonprofits choose Janagana</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Designed for mission-driven teams that need speed, clarity, and control.</h2>
            <p className="text-base text-muted-foreground">Janagana helps small and midsize nonprofits move faster by reducing manual work, centralizing volunteer and donor workflows, and delivering a member-focused experience.</p>
          </div>
          <div className="grid gap-4">
            <Card className="rounded-3xl border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardTitle>Launch with confidence</CardTitle>
              <CardDescription>Easy setup for tiers, events, and portal access plus guided onboarding for first use.</CardDescription>
            </Card>
            <Card className="rounded-3xl border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardTitle>Keep members engaged</CardTitle>
              <CardDescription>Track member activity, donations, event registrations, and volunteer commitments in one place.</CardDescription>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
