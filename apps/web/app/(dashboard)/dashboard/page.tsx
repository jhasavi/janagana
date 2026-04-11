'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import {
  Users, Calendar, Clock, HandHeart, Award,
  Plus, Megaphone, AlertTriangle, ChevronRight,
  UserPlus, DollarSign, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ApiStatusIndicator from '@/components/common/ApiStatusIndicator';

import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';

import {
  useDashboardStats,
  useActivityFeed,
  useUpcomingEvents,
  useMemberAnalytics,
  useVolunteerAnalytics,
  useRevenueAnalytics,
  useClubAnalytics,
} from '@/hooks/useAnalytics';
import type { ActivityItem } from '@/lib/types/analytics';

// ─── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(end: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let startTime = 0;
    const step = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else setCount(end);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);
  return count;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  title, value, icon: Icon, href, loading, suffix = '',
}: { title: string; value: number; icon: React.ElementType; href?: string; loading?: boolean; suffix?: string }) {
  const count = useCountUp(loading ? 0 : value);
  const content = (
    <div className="rounded-xl border bg-card p-4 space-y-1 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading
        ? <Skeleton className="h-8 w-16" />
        : <p className="text-2xl font-bold">{count.toLocaleString()}{suffix}</p>
      }
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Activity icon ─────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<ActivityItem['type'], React.ElementType> = {
  member_join: UserPlus,
  event_registration: Calendar,
  volunteer_application: HandHeart,
  payment: DollarSign,
  club_join: Users,
};

const ACTIVITY_COLORS: Record<ActivityItem['type'], string> = {
  member_join: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  event_registration: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  volunteer_application: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  club_join: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.firstName ?? 'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useActivityFeed();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingEvents();
  const { data: memberData, isLoading: memberLoading } = useMemberAnalytics();
  const { data: volunteerData } = useVolunteerAnalytics();
  const { data: revenueData } = useRevenueAnalytics();
  const { data: clubData } = useClubAnalytics();

  return (
    <div className="space-y-8">
      {/* ─── Welcome header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <ApiStatusIndicator />
          <Link href="/dashboard/analytics">
            <Button variant="outline" size="sm">
              <BarChart2 className="h-4 w-4 mr-1.5" />
              Full Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Quick actions ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/members/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Member</Button>
        </Link>
        <Link href="/dashboard/events/new">
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Create Event</Button>
        </Link>
        <Link href="/dashboard/volunteers/opportunities/new">
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> New Opportunity</Button>
        </Link>
        <Link href="/dashboard/clubs/new">
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> New Club</Button>
        </Link>
        <Link href="/dashboard/communications/new">
          <Button size="sm" variant="outline"><Megaphone className="h-4 w-4 mr-1" /> Announcement</Button>
        </Link>
      </div>

      {/* ─── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile title="Total Members" value={stats?.totalMembers ?? 0} icon={Users} href="/dashboard/members" loading={statsLoading} />
        <StatTile title="Active Members" value={stats?.activeMembers ?? 0} icon={Users} href="/dashboard/members" loading={statsLoading} />
        <StatTile title="New This Month" value={stats?.newThisMonth ?? 0} icon={UserPlus} loading={statsLoading} />
        <StatTile title="Upcoming Events" value={stats?.upcomingEvents ?? 0} icon={Calendar} href="/dashboard/events" loading={statsLoading} />
        <StatTile title="Registrations" value={stats?.registrationsThisMonth ?? 0} icon={Calendar} loading={statsLoading} />
        <StatTile title="Volunteer Hours" value={stats?.volunteerHoursThisMonth ?? 0} icon={Clock} href="/dashboard/volunteers" loading={statsLoading} />
        <StatTile title="Active Volunteers" value={stats?.activeVolunteers ?? 0} icon={HandHeart} loading={statsLoading} />
        <StatTile title="Active Clubs" value={stats?.activeClubs ?? 0} icon={Award} href="/dashboard/clubs" loading={statsLoading} />
        <StatTile title="Club Members" value={stats?.clubMembers ?? 0} icon={Users} loading={statsLoading} />
      </div>

      {/* ─── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          {/* Membership growth */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Membership Growth (12 months)</CardTitle>
                <Link href="/dashboard/analytics?tab=members">
                  <Button variant="ghost" size="sm" className="text-xs h-7">View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={memberData?.growth ?? []}
                areas={[
                  { dataKey: 'total', name: 'Total Members', color: '#3b82f6' },
                  { dataKey: 'newMembers', name: 'New Members', color: '#22c55e' },
                ]}
                xDataKey="month"
                height={240}
                loading={memberLoading}
              />
            </CardContent>
          </Card>

          {/* Activity feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : !activity || activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {(activity ?? []).slice(0, 20).map((item) => {
                    const Icon = ACTIVITY_ICONS[item.type] ?? Users;
                    const colorClass = ACTIVITY_COLORS[item.type] ?? '';
                    const initials = item.actorName.split(' ').map(n => n[0]).join('');
                    return (
                      <div key={item.id} className="flex items-start gap-3 py-2">
                        <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{item.actorName}</span>{' '}
                            <span className="text-muted-foreground">{item.description}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">
          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Upcoming Events</CardTitle>
                <Link href="/dashboard/events">
                  <Button variant="ghost" size="sm" className="text-xs h-7">See all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              {upcomingLoading ? (
                <Skeleton className="h-28" />
              ) : !upcoming || upcoming.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                (upcoming).map(e => (
                  <Link
                    key={e.id}
                    href={`/dashboard/events/${e.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                      <span className="text-xs font-bold leading-tight">{format(new Date(e.startsAt), 'MMM').toUpperCase()}</span>
                      <span className="text-base font-bold leading-tight">{format(new Date(e.startsAt), 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e._count.registrations} registered</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pending actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Member applications', count: stats?.pendingMemberApplications ?? 0, href: '/dashboard/members?status=PENDING' },
                { label: 'Volunteer applications', count: stats?.pendingVolunteerApplications ?? 0, href: '/dashboard/volunteers?tab=applications&status=PENDING' },
                { label: 'Hour approvals', count: stats?.pendingHourApprovals ?? 0, href: '/dashboard/volunteers?tab=hours&approved=false' },
                { label: 'Expiring memberships', count: stats?.expiringMemberships ?? 0, href: '/dashboard/members?expiring=30' },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm">{item.label}</span>
                  {statsLoading
                    ? <Skeleton className="h-5 w-8" />
                    : <Badge variant={item.count > 0 ? 'destructive' : 'secondary'}>
                      {item.count}
                    </Badge>
                  }
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Revenue this month */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Revenue This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <Skeleton className="h-10" />
                : <p className="text-3xl font-bold">${(stats?.revenueThisMonth ?? 0).toLocaleString()}</p>
              }
              <Link href="/dashboard/analytics?tab=revenue">
                <Button variant="ghost" size="sm" className="mt-2 text-xs h-7 px-0">
                  Revenue breakdown <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Bottom section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Events revenue bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Revenue Trend (12 months)</CardTitle>
              <Link href="/dashboard/analytics?tab=revenue">
                <Button variant="ghost" size="sm" className="text-xs h-7">Details</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={revenueData?.monthly ?? []}
              bars={[
                { dataKey: 'memberships', name: 'Memberships', color: '#3b82f6' },
                { dataKey: 'events', name: 'Events', color: '#8b5cf6' },
                { dataKey: 'other', name: 'Other', color: '#22c55e' },
              ]}
              xDataKey="month"
              height={220}
              stacked
              yTickFormatter={v => `$${v}`}
              tooltipFormatter={v => `$${v.toLocaleString()}`}
            />
          </CardContent>
        </Card>

        {/* Top volunteers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Volunteers (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            {!volunteerData?.topVolunteers || volunteerData.topVolunteers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {volunteerData.topVolunteers.slice(0, 7).map((v, i) => (
                  <div key={v.name} className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-xs">
                        {v.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm flex-1 truncate">{v.name}</p>
                    <span className="text-xs font-semibold text-muted-foreground">{v.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most active clubs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Most Active Clubs</CardTitle>
          </CardHeader>
          <CardContent>
            {!clubData?.topClubs || clubData.topClubs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {clubData.topClubs.slice(0, 7).map((club, i) => (
                  <Link
                    key={club.id}
                    href={`/dashboard/clubs/${club.id}`}
                    className="flex items-center gap-2 hover:bg-muted/30 rounded-md -mx-1 px-1 py-0.5 transition-colors"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                    <p className="text-sm flex-1 truncate">{club.name}</p>
                    <span className="text-xs text-muted-foreground">{club.memberCount}m/{club.postCount}p</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

