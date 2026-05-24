import type { Metadata } from 'next'
import { BarChart2, Users, CalendarDays, Heart, Clock } from 'lucide-react'
import { getAnalytics } from '@/lib/actions/analytics'
import { Card, CardContent } from '@/components/ui/card'
import { AnalyticsCharts } from './_components/analytics-charts'
import { AnalyticsWidgetBoundary } from './_components/analytics-widget-boundary'

export const metadata: Metadata = { title: 'Analytics' }

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  const result = await getAnalytics()
  const data = result.success && result.data ? result.data : null

  const summary = {
    totalMembers: typeof data?.summary?.totalMembers === 'number' ? data.summary.totalMembers : 0,
    totalEvents: typeof data?.summary?.totalEvents === 'number' ? data.summary.totalEvents : 0,
    totalVolunteerOpps: typeof data?.summary?.totalVolunteerOpps === 'number' ? data.summary.totalVolunteerOpps : 0,
    totalApprovedHours: typeof data?.summary?.totalApprovedHours === 'number' ? data.summary.totalApprovedHours : 0,
  }

  const hasChartData = Boolean(
    data
    && Array.isArray(data.memberGrowth)
    && Array.isArray(data.eventAttendance)
    && Array.isArray(data.volunteerHours)
    && Array.isArray(data.memberStatus),
  )

  if (data && !hasChartData) {
    console.error('[AnalyticsPage] invalid analytics payload shape', {
      hasMemberGrowth: Array.isArray(data.memberGrowth),
      hasEventAttendance: Array.isArray(data.eventAttendance),
      hasVolunteerHours: Array.isArray(data.volunteerHours),
      hasMemberStatus: Array.isArray(data.memberStatus),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart2 className="h-6 w-6" />
          Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Organization-wide reporting and activity trends.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={summary.totalMembers} icon={Users} />
        <StatCard label="Total Events" value={summary.totalEvents} icon={CalendarDays} />
        <StatCard label="Volunteer Opps" value={summary.totalVolunteerOpps} icon={Heart} />
        <StatCard label="Approved Vol. Hours" value={summary.totalApprovedHours.toFixed(1)} icon={Clock} />
      </div>

      {/* Charts */}
      {data && hasChartData ? (
        <AnalyticsWidgetBoundary>
          <AnalyticsCharts
            memberGrowth={data.memberGrowth}
            eventAttendance={data.eventAttendance}
            volunteerHours={data.volunteerHours}
            memberStatus={data.memberStatus}
          />
        </AnalyticsWidgetBoundary>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm" data-testid="analytics-fallback">
          Unable to load this section. No analytics data is available yet.
        </div>
      )}
    </div>
  )
}
