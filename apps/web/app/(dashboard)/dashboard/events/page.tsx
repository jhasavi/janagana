'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus,
  Calendar,
  LayoutList,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Download,
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
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
import { StatsCard } from '@/components/common/StatsCard';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';

import {
  useEvents,
  useEventStats,
  useEventCalendar,
  useDeleteEvent,
  useDuplicateEvent,
  useUpdateEventStatus,
} from '@/hooks/useEvents';
import type { EventListItem, EventFilters, EventStatus } from '@/lib/types/event';

type ViewMode = 'table' | 'calendar';

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function EventsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: EventFilters = {
    ...(search ? { search } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter as EventStatus } : {}),
    ...(formatFilter !== 'ALL' ? { format: formatFilter as EventListItem['format'] } : {}),
    page,
    limit: 20,
  };

  const { data: eventsData, isLoading } = useEvents(filters);
  const { data: stats } = useEventStats();
  const { data: calendarData, isLoading: isCalLoading } = useEventCalendar(calMonth, calYear);
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();
  const updateStatus = useUpdateEventStatus();

  const events = eventsData?.data ?? [];
  const totalCount = eventsData?.meta.total ?? 0;
  const totalPages = eventsData?.meta.totalPages ?? 1;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEvent.mutateAsync(deleteId);
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await duplicateEvent.mutateAsync(id);
      toast.success('Event duplicated');
      router.push(`/dashboard/events/${copy.id}`);
    } catch {
      toast.error('Failed to duplicate event');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: 'PUBLISHED' } });
      toast.success('Event published');
    } catch {
      toast.error('Failed to publish event');
    }
  };

  const columns: ColumnDef<EventListItem>[] = [
    {
      accessorKey: 'title',
      header: 'Event',
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <div className="flex flex-col">
            <Link
              href={`/dashboard/events/${ev.id}`}
              className="font-medium hover:underline"
            >
              {ev.title}
            </Link>
            {ev.category && (
              <span className="text-xs text-muted-foreground">{ev.category.name}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <EventStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => {
        const fmt = row.original.format;
        return (
          <Badge variant="outline" className="text-xs">
            {fmt === 'IN_PERSON' ? 'In Person' : fmt === 'VIRTUAL' ? 'Virtual' : 'Hybrid'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'startsAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.startsAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'registrations',
      header: 'Registrations',
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <span className="text-sm">
            {ev._count.registrations}
            {ev.capacity ? ` / ${ev.capacity}` : ''}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/events/${ev.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/events/${ev.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {ev.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => void handlePublish(ev.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void handleDuplicate(ev.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteId(ev.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
        title="Events"
        description="Create and manage your organization's events."
        actions={
          <Button asChild>
            <Link href="/dashboard/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatsCard
              title="Total Events"
              value={stats.totalEvents}
              icon={CalendarDays}
            />
            <StatsCard
              title="Upcoming"
              value={stats.upcomingEvents}
              icon={Clock}
            />
            <StatsCard
              title="Past"
              value={stats.pastEvents}
              icon={CheckCircle2}
            />
            <StatsCard
              title="Total Registrations"
              value={stats.totalRegistrations}
              icon={Users}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        )}
      </div>

      {/* Filters & Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search events..."
          className="w-60"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Formats</SelectItem>
            <SelectItem value="IN_PERSON">In Person</SelectItem>
            <SelectItem value="VIRTUAL">Virtual</SelectItem>
            <SelectItem value="HYBRID">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('table')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('calendar')}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <MobileDataTable
          columns={columns}
          data={events}
        />
      ) : (
        <EventCalendar
          month={calMonth}
          year={calYear}
          byDate={calendarData?.byDate ?? {}}
          isLoading={isCalLoading}
          onMonthChange={(m, y) => { setCalMonth(m); setCalYear(y); }}
          onEventClick={(ev) => router.push(`/dashboard/events/${ev.id}`)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Event"
        description="This will permanently delete the event and all registrations. This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
