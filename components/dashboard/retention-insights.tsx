import Link from 'next/link'
import { AlertCircle, CalendarClock, CircleDollarSign, UserRoundX, UsersRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { RenewalReminderButton } from '@/components/dashboard/renewal-reminder-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export async function RetentionInsights() {
  try {
    const tenant = await getTenant()
    if (!tenant) return null

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [renewalsDue, expiredRenewals, membersWithoutTier, quietMembers, dueSoonMembers] = await Promise.all([
      prisma.member.count({
        where: { tenantId: tenant.id, status: 'ACTIVE', renewsAt: { gte: now, lte: in30Days } },
      }).catch(() => 0),
      prisma.member.count({
        where: { tenantId: tenant.id, status: 'ACTIVE', renewsAt: { lt: now } },
      }).catch(() => 0),
      prisma.member.count({
        where: { tenantId: tenant.id, status: 'ACTIVE', tierId: null },
      }).catch(() => 0),
      prisma.member.count({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          eventRegistrations: { none: {} },
          volunteerSignups: { none: {} },
          donations: { none: {} },
        },
      }).catch(() => 0),
      prisma.member.findMany({
        where: { tenantId: tenant.id, status: 'ACTIVE', renewsAt: { gte: now, lte: in30Days } },
        select: { id: true, firstName: true, lastName: true, renewsAt: true },
        orderBy: { renewsAt: 'asc' },
        take: 5,
      }).catch(() => []),
    ])

    const recommendedAction = expiredRenewals > 0
      ? 'Start with overdue renewals before inviting more members.'
      : renewalsDue > 0
        ? 'Send renewal reminders this week.'
        : quietMembers > 0
          ? 'Invite quiet members to the next event or volunteer opportunity.'
          : 'Retention signals look healthy.'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-emerald-600" />
              <CardTitle>Retention Intelligence</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Weekly signals that help admins know who needs attention next.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Badge variant={expiredRenewals > 0 || renewalsDue > 0 ? 'warning' : 'success'}>
              {recommendedAction}
            </Badge>
            {(renewalsDue > 0 || expiredRenewals > 0) && <RenewalReminderButton />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <p className="text-xs font-medium">Due in 30 days</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{renewalsDue}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs font-medium">Overdue renewals</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{expiredRenewals}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CircleDollarSign className="h-4 w-4" />
              <p className="text-xs font-medium">No tier assigned</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{membersWithoutTier}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserRoundX className="h-4 w-4" />
              <p className="text-xs font-medium">No engagement yet</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{quietMembers}</p>
          </div>
        </div>

        {dueSoonMembers.length > 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Renewals to review first</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/members">Open members</Link>
              </Button>
            </div>
            <div className="mt-3 divide-y">
              {dueSoonMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/dashboard/members/${member.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:underline"
                >
                  <span>{member.firstName} {member.lastName}</span>
                  <span className="text-muted-foreground">{formatDate(member.renewsAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
  } catch (error) {
    console.error('[RetentionInsights]', error)
    return null
  }
}
