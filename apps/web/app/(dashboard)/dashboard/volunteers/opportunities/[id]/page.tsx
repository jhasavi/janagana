'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Users,
  Clock,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Copy,
  CheckCircle2,
  Send,
  MoreHorizontal,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApplicationTable } from '@/components/volunteers/ApplicationTable';
import { HoursLogTable } from '@/components/volunteers/HoursLogTable';
import { ShiftRosterModal } from '@/components/volunteers/ShiftRosterModal';
import { LogHoursModal } from '@/components/volunteers/LogHoursModal';

import {
  useOpportunity,
  useOpportunityApplications,
  useOpportunityShifts,
  useDeleteOpportunity,
  usePublishOpportunity,
  useCloseOpportunity,
  useDuplicateOpportunity,
  useReviewApplication,
  useBulkReviewApplications,
  useMarkShiftComplete,
  useShiftRoster,
  useOrganizationHours,
  useApproveHours,
  useRejectHours,
  useLogHours,
} from '@/hooks/useVolunteers';
import type { VolunteerLocation, VolunteerShift } from '@/lib/types/volunteer';
import type { LogHoursInput } from '@/lib/validations/volunteer';

function parseLocation(raw: string | null): VolunteerLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as VolunteerLocation; } catch { return null; }
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [tab, setTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rosterShiftId, setRosterShiftId] = useState<string | null>(null);
  const [showLogHours, setShowLogHours] = useState(false);

  const { data: opp, isLoading } = useOpportunity(id);
  const { data: applications, isLoading: appsLoading } = useOpportunityApplications(id);
  const { data: shifts, isLoading: shiftsLoading } = useOpportunityShifts(id);
  const { data: roster, isLoading: rosterLoading } = useShiftRoster(id, rosterShiftId ?? '');
  const { data: hours, isLoading: hoursLoading } = useOrganizationHours({ opportunityId: id });

  const deleteMutation = useDeleteOpportunity();
  const publishMutation = usePublishOpportunity();
  const closeMutation = useCloseOpportunity();
  const duplicateMutation = useDuplicateOpportunity();
  const reviewMutation = useReviewApplication();
  const bulkReviewMutation = useBulkReviewApplications();
  const markCompleteMutation = useMarkShiftComplete();
  const approveHoursMutation = useApproveHours();
  const rejectHoursMutation = useRejectHours();
  const logHoursMutation = useLogHours();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Opportunity deleted');
      router.push('/dashboard/volunteers/opportunities');
    } catch {
      toast.error('Failed to delete opportunity');
    }
  };

  const handleReview = async (appId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    await reviewMutation.mutateAsync({ id: appId, data: { status, notes } });
    toast.success(`Application ${status.toLowerCase()}`);
  };

  const handleBulkApprove = async (ids: string[]) => {
    await bulkReviewMutation.mutateAsync({ applicationIds: ids, status: 'APPROVED' });
    toast.success(`${ids.length} applications approved`);
  };

  const handleBulkReject = async (ids: string[]) => {
    await bulkReviewMutation.mutateAsync({ applicationIds: ids, status: 'REJECTED' });
    toast.success(`${ids.length} applications rejected`);
  };

  const handleMarkComplete = async (shiftId: string) => {
    try {
      await markCompleteMutation.mutateAsync(shiftId);
      toast.success('Shift marked as complete');
    } catch {
      toast.error('Failed to update shift');
    }
  };

  const handleLogHours = async (data: LogHoursInput) => {
    await logHoursMutation.mutateAsync(data);
    toast.success('Hours logged');
  };

  const location = parseLocation(opp?.location ?? null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={opp.title}
        description={`${opp.isActive ? 'Active' : 'Inactive'} · ${opp.startsAt ? format(new Date(opp.startsAt), 'MMM d, yyyy') : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Volunteers', href: '/dashboard/volunteers' },
          { label: 'Opportunities', href: '/dashboard/volunteers/opportunities' },
          { label: opp.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {opp.isActive ? (
              <Button
                variant="outline"
                onClick={() => void closeMutation.mutateAsync(id).then(() => toast.success('Opportunity closed'))}
              >
                <PowerOff className="h-4 w-4 mr-2" /> Close
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void publishMutation.mutateAsync(id).then(() => toast.success('Opportunity published'))}
              >
                <Power className="h-4 w-4 mr-2" /> Publish
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    void duplicateMutation.mutateAsync(id).then((copy) => {
                      toast.success('Duplicated');
                      router.push(`/dashboard/volunteers/opportunities/${copy.id}`);
                    })
                  }
                >
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">
            Applications
            {(applications?.meta?.total ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{applications?.meta?.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-2xl font-bold">{opp._count.applications}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-2xl font-bold">{opp._count.shifts}</p>
                <p className="text-sm text-muted-foreground mt-1">Shifts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-2xl font-bold">{opp.totalHours ?? '—'}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Hours</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</p>
              <p className="text-sm whitespace-pre-line">{opp.description}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Location</p>
                {opp.isVirtual ? (
                  <span className="flex items-center gap-1.5"><Video className="h-4 w-4" /> Virtual</span>
                ) : location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[location.name, location.city, location.state].filter(Boolean).join(', ')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Dates</p>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {opp.startsAt ? format(new Date(opp.startsAt), 'MMM d, yyyy') : '—'}
                  {opp.endsAt ? ` → ${format(new Date(opp.endsAt), 'MMM d, yyyy')}` : ''}
                </span>
              </div>
            </div>
            {opp.skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.skills.map((s) => (
                      <Badge key={s.id} variant={s.isRequired ? 'default' : 'secondary'}>
                        {s.name}{s.isRequired ? ' *' : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── APPLICATIONS ─────────────────────────────────────────────── */}
        <TabsContent value="applications" className="mt-6">
          <ApplicationTable
            applications={applications?.data ?? []}
            onReview={handleReview}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            showOpportunity={false}
          />
        </TabsContent>

        {/* ─── SHIFTS ───────────────────────────────────────────────────── */}
        <TabsContent value="shifts" className="mt-6 space-y-4">
          {shiftsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !shifts?.length ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Clock className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No shifts yet.</p>
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="rounded-xl border p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{shift.name}</p>
                    <Badge
                      variant={
                        shift.status === 'OPEN' ? 'success' :
                          shift.status === 'FULL' ? 'warning' :
                            shift.status === 'COMPLETED' ? 'info' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {shift.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(shift.startsAt), 'MMM d, yyyy • h:mm a')}
                    {' → '}
                    {format(new Date(shift.endsAt), 'h:mm a')}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {shift._count.signups} / {shift.capacity} signed up
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setRosterShiftId(shift.id)}
                  >
                    View Roster
                  </Button>
                  {shift.status !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => void handleMarkComplete(shift.id)}
                      disabled={markCompleteMutation.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* ─── HOURS ────────────────────────────────────────────────────── */}
        <TabsContent value="hours" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowLogHours(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Log Hours
            </Button>
          </div>
          <HoursLogTable
            logs={hours?.logs ?? []}
            onApprove={(hid) => void approveHoursMutation.mutateAsync(hid).then(() => toast.success('Approved'))}
            onReject={(hid) => void rejectHoursMutation.mutateAsync({ id: hid, reason: 'Rejected by admin' }).then(() => toast.success('Rejected'))}
          />
        </TabsContent>

        {/* ─── VOLUNTEERS ───────────────────────────────────────────────── */}
        <TabsContent value="volunteers" className="mt-6">
          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(applications?.data ?? [])
                .filter((a) => a.status === 'APPROVED')
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {a.member.firstName.charAt(0)}{a.member.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.member.firstName} {a.member.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.member.email}</p>
                    </div>
                    {a.member.phone && (
                      <p className="text-sm text-muted-foreground hidden sm:block">{a.member.phone}</p>
                    )}
                  </div>
                ))}
              {(applications?.data ?? []).filter((a) => a.status === 'APPROVED').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No confirmed volunteers yet.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Shift Roster Modal */}
      {rosterShiftId && (
        <ShiftRosterModal
          roster={roster ?? null}
          isLoading={rosterLoading}
          onClose={() => setRosterShiftId(null)}
        />
      )}

      {/* Log Hours Modal */}
      {showLogHours && (
        <LogHoursModal
          opportunityId={id}
          onClose={() => setShowLogHours(false)}
          onSubmit={handleLogHours}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Opportunity"
        description="This will permanently delete this opportunity and all associated data."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
