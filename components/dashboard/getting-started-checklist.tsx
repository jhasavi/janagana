import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

interface Step {
  id: string
  label: string
  description: string
  done: boolean
  href: string
  cta: string
}

export async function GettingStartedChecklist() {
  const tenant = await getTenant()
  if (!tenant) return null

  const [memberCount, eventCount, tierCount] = await Promise.all([
    prisma.member.count({ where: { tenantId: tenant.id } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
    prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
  ])

  const steps: Step[] = [
    {
      id: 'org',
      label: 'Create your organization',
      description: 'Your JanaGana workspace is set up and ready.',
      done: true,
      href: '/dashboard/settings',
      cta: 'View Settings',
    },
    {
      id: 'tier',
      label: 'Add a membership tier',
      description: 'Define the plans members can join (Free, Annual, etc.).',
      done: tierCount > 0,
      href: '/dashboard/settings#tiers',
      cta: 'Add Tier',
    },
    {
      id: 'members',
      label: 'Add your first member',
      description: 'Invite or manually add members to your organization.',
      done: memberCount > 0,
      href: '/dashboard/members/new',
      cta: 'Add Member',
    },
    {
      id: 'event',
      label: 'Create your first event',
      description: 'Schedule an event for members to discover and register.',
      done: eventCount > 0,
      href: '/dashboard/events/new',
      cta: 'Create Event',
    },
    {
      id: 'embed',
      label: 'Install the member portal embed',
      description: 'Add JanaGana to your website so members can self-serve.',
      done: false, // static — no persistence needed
      href: '/dashboard/integrations',
      cta: 'Get Embed Code',
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length

  // Hide once fully complete
  if (allDone) return null

  return (
    <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {doneCount}/{steps.length} steps completed
            </CardDescription>
          </div>
          <div className="text-xs font-medium text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300 px-2.5 py-1 rounded-full">
            {Math.round((doneCount / steps.length) * 100)}% done
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center justify-between gap-3 rounded-lg p-3 ${
              step.done
                ? 'opacity-60'
                : 'bg-white dark:bg-zinc-900/60 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.done && (
              <Button asChild size="sm" variant="ghost" className="shrink-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100">
                <Link href={step.href}>
                  {step.cta}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
