'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, ChevronLeft } from 'lucide-react';

import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { MetricCard } from '@/components/charts/MetricCard';

import {
  useMemberAnalytics,
  useEventAnalytics,
  useVolunteerAnalytics,
  useClubAnalytics,
  useRevenueAnalytics,
  DATE_PRESETS,
  presetToRange,
  type DateRange,
} from '@/hooks/useAnalytics';

// ─── Date range picker ─────────────────────────────────────────────────────────

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const applyPreset = (days: number) => {
    setActivePreset(days);
    onChange(presetToRange(days));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {DATE_PRESETS.map(p => (
        <Button
          key={p.label}
          size="sm"
          variant={activePreset === p.days ? 'default' : 'outline'}
          className="h-8 px-3 text-xs"
          onClick={() => applyPreset(p.days)}
        >
          {p.label}
        </Button>
      ))}
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={value.startDate ?? ''}
            onChange={e => {
              setActivePreset(null);
              onChange({ ...value, startDate: e.target.value || undefined });
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={value.endDate ?? ''}
            onChange={e => {
              setActivePreset(null);
              onChange({ ...value, endDate: e.target.value || undefined });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useMemberAnalytics(range);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Members"
          value={data?.growth.at(-1)?.total ?? 0}
          loading={isLoading}
        />
        <MetricCard
          title="New This Period"
          value={data?.growth.reduce((s, g) => s + g.newMembers, 0) ?? 0}
          loading={isLoading}
        />
        <MetricCard
          title="Active Rate"
          value={
            data
              ? (() => {
                  const active = data.statusDistribution.find(s => s.name === 'ACTIVE')?.value ?? 0;
                  const total = data.statusDistribution.reduce((s, d) => s + d.value, 0);
                  return total > 0 ? Math.round((active / total) * 100) : 0;
                })()
              : 0
          }
          formatter={v => `${v}%`}
          loading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Membership Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={data?.growth ?? []}
              areas={[
                { dataKey: 'total', name: 'Total', color: '#3b82f6' },
                { dataKey: 'newMembers', name: 'New', color: '#22c55e' },
              ]}
              xDataKey="month"
              height={240}
              loading={isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={data?.statusDistribution ?? []}
              height={200}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={data?.tierDistribution ?? []}
            height={200}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Events tab ────────────────────────────────────────────────────────────────

function EventsTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useEventAnalytics(range);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Total Registrations"
          value={data?.totalRegistrations ?? 0}
          loading={isLoading}
        />
        <MetricCard
          title="Attendance Rate"
          value={data?.attendanceRate ?? 0}
          formatter={v => `${v}%`}
          loading={isLoading}
        />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Events & Registrations (monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={data?.eventsPerMonth ?? []}
            bars={[
              { dataKey: 'events', name: 'Events', color: '#8b5cf6' },
              { dataKey: 'registrations', name: 'Registrations', color: '#3b82f6' },
            ]}
            xDataKey="month"
            height={240}
            loading={isLoading}
          />
        </CardContent>
      </Card>
      {(data?.revenuePerEvent?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by Event (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data?.revenuePerEvent ?? []}
              bars={[{ dataKey: 'revenue', name: 'Revenue ($)' }]}
              xDataKey="title"
              height={260}
              horizontal
              yTickFormatter={v => `$${v}`}
              tooltipFormatter={v => `$${v.toLocaleString()}`}
              colorEachBar
              loading={isLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Volunteers tab ────────────────────────────────────────────────────────────

function VolunteersTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useVolunteerAnalytics(range);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Conversion Rate"
          value={data?.conversionRate ?? 0}
          formatter={v => `${v}%`}
          loading={isLoading}
        />
        <MetricCard
          title="Participation Rate"
          value={data?.participationRate ?? 0}
          formatter={v => `${v}%`}
          loading={isLoading}
        />
        <MetricCard
          title="Pending Applications"
          value={data?.applicationStats.pending ?? 0}
          loading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Volunteer Hours (monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data?.hoursPerMonth ?? []}
              bars={[{ dataKey: 'hours', name: 'Hours', color: '#22c55e' }]}
              xDataKey="month"
              height={240}
              loading={isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={
                data
                  ? [
                      { name: 'Approved', value: data.applicationStats.approved },
                      { name: 'Pending', value: data.applicationStats.pending },
                      { name: 'Rejected', value: data.applicationStats.rejected },
                    ].filter(d => d.value > 0)
                  : []
              }
              colors={['#22c55e', '#f59e0b', '#ef4444']}
              height={200}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
      {(data?.topVolunteers?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Volunteers</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data?.topVolunteers ?? []}
              bars={[{ dataKey: 'hours', name: 'Hours', color: '#22c55e' }]}
              xDataKey="name"
              height={220}
              horizontal
              colorEachBar
              loading={isLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Clubs tab ─────────────────────────────────────────────────────────────────

function ClubsTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useClubAnalytics(range);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Club Growth (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={data?.growth ?? []}
              areas={[
                { dataKey: 'clubs', name: 'New Clubs', color: '#ec4899' },
                { dataKey: 'members', name: 'New Members', color: '#8b5cf6' },
              ]}
              xDataKey="month"
              height={240}
              loading={isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active vs Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={data?.categoryBreakdown ?? []}
              colors={['#22c55e', '#94a3b8']}
              height={200}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
      {(data?.topClubs?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Most Active Clubs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr,80px,80px] text-xs font-medium text-muted-foreground pb-2">
                <span>Club</span>
                <span className="text-right">Members</span>
                <span className="text-right">Posts</span>
              </div>
              {data?.topClubs.map((club, i) => (
                <Link
                  key={club.id}
                  href={`/dashboard/clubs/${club.id}`}
                  className="grid grid-cols-[1fr,80px,80px] items-center hover:bg-muted/30 -mx-2 px-2 py-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm">{club.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto justify-center">{club.memberCount}</Badge>
                  <Badge variant="outline" className="ml-auto justify-center">{club.postCount}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Revenue tab ───────────────────────────────────────────────────────────────

function RevenueTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useRevenueAnalytics(range);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Revenue"
          value={data?.totalPaid ?? 0}
          formatter={v => `$${v.toLocaleString()}`}
          loading={isLoading}
        />
        <MetricCard
          title="Monthly Recurring (MRR)"
          value={data?.mrr ?? 0}
          formatter={v => `$${v.toLocaleString()}`}
          loading={isLoading}
        />
        <MetricCard
          title="Annual Recurring (ARR)"
          value={data?.arr ?? 0}
          formatter={v => `$${v.toLocaleString()}`}
          loading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data?.monthly ?? []}
              bars={[
                { dataKey: 'memberships', name: 'Memberships', color: '#3b82f6' },
                { dataKey: 'events', name: 'Events', color: '#8b5cf6' },
                { dataKey: 'other', name: 'Other', color: '#22c55e' },
              ]}
              xDataKey="month"
              height={240}
              stacked
              yTickFormatter={v => `$${v}`}
              tooltipFormatter={v => `$${v.toLocaleString()}`}
              loading={isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={data?.breakdown.map(b => ({ name: b.type, value: b.amount })) ?? []}
              valueFormatter={v => `$${v.toLocaleString()}`}
              height={200}
              loading={isLoading}
            />
            <div className="mt-3 space-y-1">
              {data?.breakdown.map(b => (
                <div key={b.type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${b.amount.toLocaleString()}</span>
                    <Badge variant="secondary" className="text-xs">{b.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(() => presetToRange(30));
  const [activeTab, setActiveTab] = useState('members');

  const searchParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : null;
  
  React.useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed insights across all areas</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersTab range={range} />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventsTab range={range} />
        </TabsContent>
        <TabsContent value="volunteers" className="mt-6">
          <VolunteersTab range={range} />
        </TabsContent>
        <TabsContent value="clubs" className="mt-6">
          <ClubsTab range={range} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
