'use server'

import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export async function getAnalytics() {
  try {
    const tenant = await requireTenant()
    const tid = tenant.id
    const now = new Date()

    // ─── Member growth (last 12 months) ─────────────────────────────────────
    const memberGrowth = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const month = subMonths(now, 11 - i)
        return prisma.member.count({
          where: {
            tenantId: tid,
            joinedAt: { lte: endOfMonth(month) },
          },
        }).then((count) => ({
          month: format(month, 'MMM yy'),
          members: count,
        }))
      })
    )

    // ─── Event attendance (last 6 months) ────────────────────────────────────
    const eventAttendance = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 5 - i)
        return prisma.eventRegistration.count({
          where: {
            event: { tenantId: tid },
            createdAt: {
              gte: startOfMonth(month),
              lte: endOfMonth(month),
            },
          },
        }).then((count) => ({
          month: format(month, 'MMM yy'),
          registrations: count,
        }))
      })
    )

    // ─── Volunteer hours by month (last 6 months) ────────────────────────────
    const signupsWithHours = await prisma.volunteerSignup.findMany({
      where: {
        opportunity: { tenantId: tid },
        hoursApproved: { not: null },
        updatedAt: { gte: subMonths(now, 6) },
      },
      select: { hoursApproved: true, updatedAt: true },
    })

    const hoursMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      hoursMap[format(subMonths(now, i), 'MMM yy')] = 0
    }
    for (const s of signupsWithHours) {
      const key = format(s.updatedAt, 'MMM yy')
      if (key in hoursMap) hoursMap[key] += s.hoursApproved ?? 0
    }
    const volunteerHours = Object.entries(hoursMap).map(([month, hours]) => ({
      month,
      hours: Math.round(hours * 10) / 10,
    }))

    // ─── Member status breakdown ──────────────────────────────────────────────
    const [activeCount, pendingCount, inactiveCount, bannedCount] = await Promise.all([
      prisma.member.count({ where: { tenantId: tid, status: 'ACTIVE' } }),
      prisma.member.count({ where: { tenantId: tid, status: 'PENDING' } }),
      prisma.member.count({ where: { tenantId: tid, status: 'INACTIVE' } }),
      prisma.member.count({ where: { tenantId: tid, status: 'BANNED' } }),
    ])
    const memberStatus = [
      { name: 'Active',   value: activeCount,   color: '#22c55e' },
      { name: 'Pending',  value: pendingCount,  color: '#f59e0b' },
      { name: 'Inactive', value: inactiveCount, color: '#94a3b8' },
      { name: 'Banned',   value: bannedCount,   color: '#ef4444' },
    ].filter((s) => s.value > 0)

    // ─── Summary stats ────────────────────────────────────────────────────────
    const [totalMembers, totalEvents, totalVolunteerOpps, totalHoursApproved] = await Promise.all([
      prisma.member.count({ where: { tenantId: tid } }),
      prisma.event.count({ where: { tenantId: tid } }),
      prisma.volunteerOpportunity.count({ where: { tenantId: tid } }),
      prisma.volunteerSignup.aggregate({
        where: { opportunity: { tenantId: tid }, hoursApproved: { not: null } },
        _sum: { hoursApproved: true },
      }),
    ])

    return {
      success: true,
      data: {
        memberGrowth,
        eventAttendance,
        volunteerHours,
        memberStatus,
        summary: {
          totalMembers,
          totalEvents,
          totalVolunteerOpps,
          totalApprovedHours: totalHoursApproved._sum.hoursApproved ?? 0,
        },
      },
    }
  } catch (error) {
    console.error('[getAnalytics]', error)
    return { success: false, error: 'Failed to load analytics', data: null }
  }
}
