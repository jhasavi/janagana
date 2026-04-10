'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { MobileDataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VolunteerHoursLog } from '@/lib/types/volunteer';

interface HoursLogTableProps {
  logs: VolunteerHoursLog[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showMember?: boolean;
}

export function HoursLogTable({
  logs,
  onApprove,
  onReject,
  showMember = true,
}: HoursLogTableProps) {
  const columns: ColumnDef<VolunteerHoursLog>[] = [
    ...(showMember
      ? ([
          {
            accessorKey: 'member',
            header: 'Member',
            cell: ({ row }: { row: { original: VolunteerHoursLog } }) => {
              const m = row.original.member;
              return (
                <div>
                  <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              );
            },
          },
        ] as ColumnDef<VolunteerHoursLog>[])
      : []),
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm">{format(new Date(row.original.date), 'MMM d, yyyy')}</span>
      ),
    },
    {
      accessorKey: 'hours',
      header: 'Hours',
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{row.original.hours}h</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{row.original.description ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'isApproved',
      header: 'Status',
      cell: ({ row }) => {
        const log = row.original;
        if (log.isApproved) {
          return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
        }
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      },
    },
    ...(onApprove || onReject
      ? ([
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: VolunteerHoursLog } }) => {
              const log = row.original;
              if (log.isApproved) return null;
              return (
                <div className="flex items-center gap-1.5">
                  {onApprove && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onApprove(log.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-600" /> Approve
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onReject(log.id)}
                    >
                      <XCircle className="h-3 w-3 text-destructive" /> Reject
                    </Button>
                  )}
                </div>
              );
            },
          },
        ] as ColumnDef<VolunteerHoursLog>[])
      : []),
  ];

  return (
    <MobileDataTable
      columns={columns}
      data={logs}
    />
  );
}
