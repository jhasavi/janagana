'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus,
  HandHeart,
  Users,
  Clock,
  FileCheck,
  Calendar,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { ApplicationStatusBadge } from '@/components/volunteers/ApplicationStatusBadge';

import {
  useVolunteerStats,
  useApplications,
  useOpportunityShifts,
  useOpportunities,
  useReviewApplication,
} from '@/hooks/useVolunteers';

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function VolunteersDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useVolunteerStats();
  const { data: applications, isLoading: appsLoading } = useApplications({
    status: 'PENDING',
    limit: 5,
  });
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities({ isActive: true, limit: 5 });

  const reviewMutation = useReviewApplication();

  const handleQuickApprove = async (id: string) => {
    try {
      await reviewMutation.mutateAsync({ id, data: { status: 'APPROVED' } });
      toast.success('Application approved');
    } catch {
      toast.error('Failed to review application');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Volunteers"
        description="Manage volunteer opportunities, applications, and hours."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Volunteers' }]}
        actions={
          <Link href="/dashboard/volunteers/opportunities/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Opportunity
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Active Opportunities" value={stats?.activeOpportunities ?? 0} icon={HandHeart} />
          <StatsCard title="Total Volunteers" value={stats?.totalVolunteers ?? 0} icon={Users} />
          <StatsCard title="Hours This Month" value={stats?.totalHoursLogged ?? 0} icon={Clock} />
          <StatsCard title="Pending Applications" value={stats?.pendingApplications ?? 0} icon={FileCheck} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Applications Needing Review
            </h2>
            <Link href="/dashboard/volunteers/applications" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !applications?.data?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-10">
                <FileCheck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No pending applications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {applications.data.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                    {app.member.firstName.charAt(0)}{app.member.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {app.member.firstName} {app.member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{app.opportunity.title}</p>
                  </div>
                  <ApplicationStatusBadge status={app.status} />
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {format(new Date(app.createdAt), 'MMM d')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => void handleQuickApprove(app.id)}
                    disabled={reviewMutation.isPending}
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links + Upcoming Opportunities */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Quick Links</h2>
            <div className="space-y-2">
              <QuickLink href="/dashboard/volunteers/applications" label="View Applications" icon={FileCheck} />
              <QuickLink href="/dashboard/volunteers/hours" label="Log Hours" icon={Clock} />
              <QuickLink href="/dashboard/volunteers/opportunities/new" label="Create Opportunity" icon={Plus} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Active Opportunities</h2>
            {oppsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : !opportunities?.data?.length ? (
              <p className="text-sm text-muted-foreground">No active opportunities.</p>
            ) : (
              <div className="space-y-2">
                {opportunities.data.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/dashboard/volunteers/opportunities/${opp.id}`}
                    className="flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{opp.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {opp._count.applications} application{opp._count.applications !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
