'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { MobileDataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { ApplicationReviewModal } from './ApplicationReviewModal';
import type { VolunteerApplication } from '@/lib/types/volunteer';

interface ApplicationTableProps {
  applications: VolunteerApplication[];
  onReview?: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) => Promise<void>;
  onBulkApprove?: (ids: string[]) => Promise<void>;
  onBulkReject?: (ids: string[]) => Promise<void>;
  showOpportunity?: boolean;
}

export function ApplicationTable({
  applications,
  onReview,
  onBulkApprove,
  onBulkReject,
  showOpportunity = true,
}: ApplicationTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewApp, setReviewApp] = useState<VolunteerApplication | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const columns: ColumnDef<VolunteerApplication>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={selectedIds.length === applications.length && applications.length > 0}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'member',
      header: 'Member',
      cell: ({ row }) => {
        const m = row.original.member;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
              {m.firstName.charAt(0)}{m.lastName.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
          </div>
        );
      },
    },
    ...(showOpportunity
      ? ([
          {
            accessorKey: 'opportunity',
            header: 'Opportunity',
            cell: ({ row }: { row: { original: VolunteerApplication } }) => (
              <p className="text-sm line-clamp-1">{row.original.opportunity.title}</p>
            ),
          },
        ] as ColumnDef<VolunteerApplication>[])
      : []),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ApplicationStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Applied',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReviewApp(app)}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              {app.status === 'PENDING' && onReview && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-green-600 focus:text-green-600"
                    onClick={() => void onReview(app.id, 'APPROVED')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void onReview(app.id, 'REJECTED')}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-2 flex gap-2">
            {onBulkApprove && (
              <Button size="sm" variant="outline" onClick={() => void onBulkApprove(selectedIds)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                Approve All
              </Button>
            )}
            {onBulkReject && (
              <Button size="sm" variant="outline" onClick={() => void onBulkReject(selectedIds)}>
                <XCircle className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                Reject All
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      <MobileDataTable
        columns={columns}
        data={applications}
      />

      {reviewApp && onReview && (
        <ApplicationReviewModal
          application={reviewApp}
          onClose={() => setReviewApp(null)}
          onReview={async (status, notes) => {
            await onReview(reviewApp.id, status, notes);
            setReviewApp(null);
          }}
        />
      )}
    </div>
  );
}
