import type { Metadata } from 'next'
import { BarChart2, Users, CalendarDays, Heart, Clock } from 'lucide-react'
import { getAnalytics } from '@/lib/actions/analytics'
import { Card, CardContent } from '@/components/ui/card'
import { AnalyticsCharts } from './_components/analytics-charts'

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
        <StatCard label="Total Members"      value={data?.summary.totalMembers      ?? 0} icon={Users} />
        <StatCard label="Total Events"       value={data?.summary.totalEvents       ?? 0} icon={CalendarDays} />
        <StatCard label="Volunteer Opps"     value={data?.summary.totalVolunteerOpps ?? 0} icon={Heart} />
        <StatCard label="Approved Vol. Hours" value={(data?.summary.totalApprovedHours ?? 0).toFixed(1)} icon={Clock} />
      </div>

      {/* Charts */}
      {data ? (
        <AnalyticsCharts
          memberGrowth={data.memberGrowth}
          eventAttendance={data.eventAttendance}
          volunteerHours={data.volunteerHours}
          memberStatus={data.memberStatus}
        />
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          Analytics data could not be loaded.
        </div>
      )}
    </div>
  )
}
