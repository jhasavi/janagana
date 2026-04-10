'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Clock, CheckCircle2, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ApplicationStatusBadge } from '@/components/volunteers/ApplicationStatusBadge';

import {
  useApplications,
  useMemberHours,
  useWithdrawApplication,
  useVolunteerStats,
} from '@/hooks/useVolunteers';
import { toast } from 'sonner';

// NOTE: In production, use the authenticated user's member ID from the session.
// This page reads it from local state or session context.
// For now we use the applications data to derive the member id.

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export default function MyActivityPage() {
  const [activeTab, setActiveTab] = useState('applications');

  // Fetch all applications for the current member (filtered on the server via session)
  const { data: applicationsData, isLoading: appsLoading } = useApplications({ limit: 50 });
  const applications = applicationsData?.data ?? [];
  const memberId = applications[0]?.memberId ?? '';

  const { data: hoursData, isLoading: hoursLoading } = useMemberHours(memberId);
  const { data: stats } = useVolunteerStats();
  const withdrawMutation = useWithdrawApplication();

  const handleWithdraw = async (appId: string) => {
    try {
      await withdrawMutation.mutateAsync(appId);
      toast.success('Application withdrawn');
    } catch {
      toast.error('Failed to withdraw application');
    }
  };

  const handleDownloadCertificate = () => {
    if (!memberId) return;
    window.open(`${BASE_URL}/api/v1/volunteers/members/${memberId}/certificate`, '_blank');
  };

  const approvedHours = hoursData?.totalApprovedHours ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Volunteer Activity</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your applications, shifts, and verified hours.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {approvedHours > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border bg-green-50 dark:bg-green-900/20 px-4 py-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-semibold">{approvedHours}h approved</span>
            </div>
          )}
          {approvedHours >= 10 && (
            <Button variant="outline" size="sm" onClick={handleDownloadCertificate}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Certificate
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications">
            Applications
            {applications.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{applications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hours">
            Hours
            {approvedHours > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{approvedHours}h</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── APPLICATIONS ──────────────────────────────────────────────── */}
        <TabsContent value="applications" className="mt-6">
          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground">Browse open opportunities and apply!</p>
              <Link href="/portal/volunteer">
                <Button variant="outline" size="sm">Browse Opportunities</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/portal/volunteer/opportunities/${app.opportunityId}`}
                        className="font-semibold hover:underline line-clamp-1"
                      >
                        {app.opportunity.title}
                      </Link>
                      {app.opportunity.startsAt && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(app.opportunity.startsAt), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <ApplicationStatusBadge status={app.status} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Applied {format(new Date(app.createdAt), 'MMMM d, yyyy')}
                  </p>

                  {app.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive border-destructive/50 hover:bg-destructive/5"
                      onClick={() => void handleWithdraw(app.id)}
                      disabled={withdrawMutation.isPending}
                    >
                      Withdraw Application
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── HOURS ─────────────────────────────────────────────────────── */}
        <TabsContent value="hours" className="mt-6">
          {!memberId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No hours logged yet.</p>
            </div>
          ) : hoursLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xl font-bold">{hoursData?.totalApprovedHours ?? 0}h</p>
                      <p className="text-xs text-muted-foreground">Approved Hours</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-xl font-bold">{hoursData?.totalPendingHours ?? 0}h</p>
                      <p className="text-xs text-muted-foreground">Pending Hours</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Log table */}
              {(hoursData?.logs ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No hours logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {hoursData!.logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{format(new Date(log.date), 'MMM d, yyyy')}</p>
                        {log.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{log.description}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0">{log.hours}h</span>
                      {log.isApproved ? (
                        <Badge variant="success" className="shrink-0 text-xs">Approved</Badge>
                      ) : (
                        <Badge variant="warning" className="shrink-0 text-xs">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
