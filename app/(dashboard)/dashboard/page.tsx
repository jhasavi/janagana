import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  Users,
  CalendarDays,
  Heart,
  TrendingUp,
  Clock,
  ArrowRight,
  UserPlus,
  CalendarPlus,
} from 'lucide-react'
import { getDashboardStats } from '@/lib/actions/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GettingStartedChecklist } from '@/components/dashboard/getting-started-checklist'

export const metadata: Metadata = { title: 'Dashboard' }

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const statsResult = await getDashboardStats()
  const stats = statsResult.data

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/members/new">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/events/new">
              <CalendarPlus className="h-4 w-4" />
              New Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Getting Started Checklist (disappears once fully complete) */}
      <Suspense fallback={null}>
        <GettingStartedChecklist />
      </Suspense>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={stats?.totalMembers ?? 0}
          subtitle={`${stats?.activeMembers ?? 0} active`}
          icon={Users}
          color="bg-indigo-500"
        />
        <StatCard
          title="Upcoming Events"
          value={stats?.upcomingEvents ?? 0}
          subtitle={`${stats?.totalEvents ?? 0} total events`}
          icon={CalendarDays}
          color="bg-purple-500"
        />
        <StatCard
          title="Open Opportunities"
          value={stats?.openOpportunities ?? 0}
          subtitle={`${stats?.totalOpportunities ?? 0} total`}
          icon={Heart}
          color="bg-rose-500"
        />
        <StatCard
          title="Volunteer Hours"
          value={(stats?.totalVolunteerHours ?? 0).toFixed(1)}
          subtitle="logged this year"
          icon={Clock}
          color="bg-emerald-500"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-base">Members</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manage your organization&apos;s members, tiers, and renewal schedules.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats?.totalMembers ?? 0} total</Badge>
              <Badge variant="success">{stats?.activeMembers ?? 0} active</Badge>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/members">
                View Members
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-base">Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Schedule and manage events, track registrations and attendance.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats?.totalEvents ?? 0} total</Badge>
              <Badge variant="info">{stats?.upcomingEvents ?? 0} upcoming</Badge>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/events">
                View Events
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2">
                <Heart className="h-5 w-5 text-rose-600" />
              </div>
              <CardTitle className="text-base">Volunteers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Post volunteer opportunities and track hours contributed.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats?.openOpportunities ?? 0} open</Badge>
              <Badge variant="warning">{(stats?.totalVolunteerHours ?? 0).toFixed(0)}h logged</Badge>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/volunteers">
                View Volunteers
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
