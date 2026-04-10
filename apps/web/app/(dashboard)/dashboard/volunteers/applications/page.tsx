'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { ApplicationTable } from '@/components/volunteers/ApplicationTable';

import {
  useApplications,
  useReviewApplication,
  useBulkReviewApplications,
} from '@/hooks/useVolunteers';
import type { VolunteerApplicationStatus } from '@/lib/types/volunteer';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filters = {
    page,
    limit: 25,
    status: statusFilter !== 'ALL' ? (statusFilter as VolunteerApplicationStatus) : undefined,
  };

  const { data, isLoading } = useApplications(filters);
  const reviewMutation = useReviewApplication();
  const bulkReviewMutation = useBulkReviewApplications();

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    await reviewMutation.mutateAsync({ id, data: { status, notes } });
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

  // Client-side search filter (server search not implemented in this endpoint)
  const displayedApplications = (data?.data ?? []).filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      app.member.firstName.toLowerCase().includes(q) ||
      app.member.lastName.toLowerCase().includes(q) ||
      app.member.email.toLowerCase().includes(q) ||
      app.opportunity.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review and manage volunteer applications across all opportunities."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Volunteers', href: '/dashboard/volunteers' },
          { label: 'Applications' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by member or opportunity..."
          className="w-72"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ApplicationTable
        applications={displayedApplications}
        onReview={handleReview}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        showOpportunity
      />

      {/* Pagination */}
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
    </div>
  );
}
