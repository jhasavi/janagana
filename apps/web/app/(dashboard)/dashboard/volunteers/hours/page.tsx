'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { HoursLogTable } from '@/components/volunteers/HoursLogTable';
import { LogHoursModal } from '@/components/volunteers/LogHoursModal';

import {
  useOrganizationHours,
  useApproveHours,
  useRejectHours,
  useLogHours,
  useExportHours,
} from '@/hooks/useVolunteers';
import type { LogHoursInput } from '@/lib/validations/volunteer';

export default function HoursPage() {
  const [search, setSearch] = useState('');
  const [isApprovedFilter, setIsApprovedFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [page, setPage] = useState(1);
  const [showLogModal, setShowLogModal] = useState(false);

  const filters = {
    page,
    limit: 25,
    isApproved: isApprovedFilter === 'ALL' ? undefined : isApprovedFilter === 'true',
  };

  const { data, isLoading } = useOrganizationHours(filters);
  const approveHoursMutation = useApproveHours();
  const rejectHoursMutation = useRejectHours();
  const logHoursMutation = useLogHours();
  const exportMutation = useExportHours();

  const handleLogHours = async (formData: LogHoursInput) => {
    await logHoursMutation.mutateAsync(formData);
    toast.success('Hours logged successfully');
  };

  const handleApprove = (id: string) => {
    void approveHoursMutation.mutateAsync(id).then(() => toast.success('Hours approved'));
  };

  const handleReject = (id: string) => {
    void rejectHoursMutation.mutateAsync({ id, reason: 'Rejected by admin' }).then(() =>
      toast.success('Hours rejected'),
    );
  };

  const handleExport = () => {
    void exportMutation.mutateAsync(filters);
  };

  // Client-side search
  const displayedLogs = (data?.logs ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.member.firstName.toLowerCase().includes(q) ||
      log.member.lastName.toLowerCase().includes(q) ||
      log.member.email.toLowerCase().includes(q) ||
      (log.description ?? '').toLowerCase().includes(q)
    );
  });

  const totalApproved = data?.totalApprovedHours ?? 0;
  const pendingCount = displayedLogs.filter((l) => !l.isApproved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer Hours"
        description="Track, approve, and export volunteer hours logged for your organization."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Volunteers', href: '/dashboard/volunteers' },
          { label: 'Hours' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button onClick={() => setShowLogModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Hours
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalApproved}h</p>
                <p className="text-sm text-muted-foreground">Total Approved Hours</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Volunteers */}
      {(data?.topVolunteers?.length ?? 0) > 0 && (
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Top Volunteers</h2>
          <div className="flex flex-wrap gap-3">
            {data!.topVolunteers.slice(0, 8).map((v, i) => (
              <div key={v.memberId} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
                <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <span className="text-sm font-medium">{(v._sum.hours ?? 0).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by member..."
          className="w-64"
        />
        <div className="flex rounded-md border overflow-hidden">
          {(['ALL', 'false', 'true'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setIsApprovedFilter(v); setPage(1); }}
              className={`px-4 py-2 text-sm transition-colors ${isApprovedFilter === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
            >
              {v === 'ALL' ? 'All' : v === 'false' ? 'Pending' : 'Approved'}
            </button>
          ))}
        </div>
      </div>

      <HoursLogTable
        logs={displayedLogs}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded-md border px-4 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.meta.totalPages}
            className="rounded-md border px-4 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showLogModal && (
        <LogHoursModal
          onClose={() => setShowLogModal(false)}
          onSubmit={handleLogHours}
        />
      )}
    </div>
  );
}
