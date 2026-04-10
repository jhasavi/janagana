'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Power,
  PowerOff,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { MobileDataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

import {
  useOpportunities,
  useDeleteOpportunity,
  usePublishOpportunity,
  useCloseOpportunity,
  useDuplicateOpportunity,
} from '@/hooks/useVolunteers';
import type { VolunteerOpportunityListItem, VolunteerCategory } from '@/lib/types/volunteer';

const CATEGORY_LABELS: Record<string, string> = {
  FUNDRAISING: 'Fundraising',
  EVENTS: 'Events',
  ADMIN: 'Admin',
  OUTREACH: 'Outreach',
  EDUCATION: 'Education',
  OTHER: 'Other',
};

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filters = {
    page,
    limit: 20,
    search: search || undefined,
    isActive: isActiveFilter === 'ALL' ? undefined : isActiveFilter === 'true',
  };

  const { data, isLoading } = useOpportunities(filters);
  const deleteMutation = useDeleteOpportunity();
  const publishMutation = usePublishOpportunity();
  const closeMutation = useCloseOpportunity();
  const duplicateMutation = useDuplicateOpportunity();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Opportunity deleted');
    } catch {
      toast.error('Failed to delete opportunity');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishMutation.mutateAsync(id);
      toast.success('Opportunity published');
    } catch {
      toast.error('Failed to publish opportunity');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeMutation.mutateAsync(id);
      toast.success('Opportunity closed');
    } catch {
      toast.error('Failed to close opportunity');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await duplicateMutation.mutateAsync(id);
      toast.success('Opportunity duplicated');
      router.push(`/dashboard/volunteers/opportunities/${copy.id}`);
    } catch {
      toast.error('Failed to duplicate opportunity');
    }
  };

  const columns: ColumnDef<VolunteerOpportunityListItem>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/volunteers/opportunities/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'skills',
      header: 'Skills',
      cell: ({ row }) => {
        const required = row.original.skills.filter((s) => s.isRequired);
        if (required.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {required.slice(0, 2).map((s) => (
              <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
            ))}
            {required.length > 2 && (
              <Badge variant="outline" className="text-xs">+{required.length - 2}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'startsAt',
      header: 'Dates',
      cell: ({ row }) => {
        const opp = row.original;
        if (!opp.startsAt) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="text-sm">
            <p>{format(new Date(opp.startsAt), 'MMM d, yyyy')}</p>
            {opp.endsAt && (
              <p className="text-xs text-muted-foreground">
                → {format(new Date(opp.endsAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'volunteers',
      header: 'Applications',
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.applications}</span>
      ),
    },
    {
      id: 'shifts',
      header: 'Shifts',
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.shifts}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const opp = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/volunteers/opportunities/${opp.id}`}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {opp.isActive ? (
                <DropdownMenuItem onClick={() => void handleClose(opp.id)}>
                  <PowerOff className="h-4 w-4 mr-2" /> Close
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => void handlePublish(opp.id)}>
                  <Power className="h-4 w-4 mr-2" /> Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void handleDuplicate(opp.id)}>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDelete(opp.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer Opportunities"
        description="Create and manage volunteer opportunities for your organization."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Volunteers', href: '/dashboard/volunteers' },
          { label: 'Opportunities' },
        ]}
        actions={
          <Link href="/dashboard/volunteers/opportunities/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Opportunity
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search opportunities..." className="w-64" />
        <Select value={isActiveFilter} onValueChange={(v) => { setIsActiveFilter(v); setPage(1); }}>
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

      <MobileDataTable
        columns={columns}
        data={data?.data ?? []}
      />

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete Opportunity"
        description="This will permanently delete this opportunity and all associated data. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDelete) void handleDelete(confirmDelete).then(() => setConfirmDelete(null));
        }}
      />
    </div>
  );
}
