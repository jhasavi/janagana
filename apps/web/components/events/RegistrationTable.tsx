'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, UserCheck, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { EventRegistration, RegistrationStatus } from '@/lib/types/event';

const REG_STATUS_STYLES: Record<
  RegistrationStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'success' },
  CANCELED: { label: 'Canceled', variant: 'destructive' },
  ATTENDED: { label: 'Attended', variant: 'info' },
  NO_SHOW: { label: 'No Show', variant: 'secondary' },
};

interface RegistrationTableProps {
  registrations: EventRegistration[];
  totalCount: number;
  page: number;
  limit: number;
  isLoading?: boolean;
  statusFilter?: RegistrationStatus | 'ALL';
  onStatusFilter: (v: RegistrationStatus | 'ALL') => void;
  onPageChange: (page: number) => void;
  onCancel: (id: string) => void;
  onCheckIn: (memberId: string) => void;
}

export function RegistrationTable({
  registrations,
  totalCount,
  page,
  limit,
  isLoading,
  statusFilter = 'ALL',
  onStatusFilter,
  onPageChange,
  onCancel,
  onCheckIn,
}: RegistrationTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} registration{totalCount !== 1 ? 's' : ''}
        </p>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilter(v as RegistrationStatus | 'ALL')}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(Object.keys(REG_STATUS_STYLES) as RegistrationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {REG_STATUS_STYLES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No registrations found.
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((reg) => {
                const cfg = REG_STATUS_STYLES[reg.status] ?? { label: reg.status, variant: 'secondary' as const };
                return (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {reg.member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={reg.member.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {reg.member.firstName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {reg.member.firstName} {reg.member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{reg.member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {reg.ticket?.name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {reg.attendance?.checkedInAt
                        ? format(new Date(reg.attendance.checkedInAt), 'h:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {reg.status === 'CONFIRMED' && !reg.attendance?.checkedInAt && (
                            <DropdownMenuItem onClick={() => onCheckIn(reg.member.id)}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Check In
                            </DropdownMenuItem>
                          )}
                          {(reg.status === 'CONFIRMED' || reg.status === 'PENDING') && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onCancel(reg.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Registration
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
