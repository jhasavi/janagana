'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ColumnDef, Row } from '@tanstack/react-table';
import {
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck,
  UserPlus,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { MobileDataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MemberStatusBadge } from '@/components/members/MemberStatusBadge';
import { MemberTierBadge } from '@/components/members/MemberTierBadge';
import { MemberImportModal } from '@/components/members/MemberImportModal';
import { MemberBulkActions } from '@/components/members/MemberBulkActions';

import {
  useMembers,
  useMemberStats,
  useDeleteMember,
  useUpdateMemberStatus,
  useMembershipTiers,
} from '@/hooks/useMembers';
import type { MemberListItem, MemberStatus, MemberFilters } from '@/lib/types/member';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpiringSoon(endsAtStr: string | null | undefined): boolean {
  if (!endsAtStr) return false;
  const endsAt = new Date(endsAtStr);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return endsAt < in30 && endsAt > new Date();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM d, yyyy');
}

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(
  onView: (id: string) => void,
  onEdit: (id: string) => void,
  onDelete: (member: MemberListItem) => void,
): ColumnDef<MemberListItem>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'name',
      header: 'Member',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link
            href={`/dashboard/members/${m.id}`}
            className="flex items-center gap-2.5 min-w-0 hover:underline"
          >
            <MemberAvatar
              firstName={m.firstName}
              lastName={m.lastName}
              avatarUrl={m.avatarUrl}
              status={m.status}
              size="sm"
            />
            <span className="font-medium text-sm truncate max-w-[160px]">
              {m.firstName} {m.lastName}
            </span>
          </Link>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.phone ?? '—'}</span>
      ),
    },
    {
      id: 'tier',
      header: 'Tier',
      cell: ({ row }) => {
        const sub = row.original.membershipSubscriptions[0];
        return <MemberTierBadge tierName={sub?.tier?.name} />;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'joinedAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.joinedAt)}</span>
      ),
    },
    {
      id: 'expiry',
      header: 'Expires',
      cell: ({ row }) => {
        const sub = row.original.membershipSubscriptions[0];
        const expiring = isExpiringSoon(sub?.endsAt);
        return (
          <span className={cn('text-sm', expiring ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {formatDate(sub?.endsAt)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(m.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(m.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(m)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];
}

// ─── Stats skeletons ──────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const { tenant } = useCurrentTenant();

  // Filters
  const [filters, setFilters] = React.useState<MemberFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = React.useState('');
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // UI state
  const [importOpen, setImportOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<MemberListItem | null>(null);
  const [selectedMembers, setSelectedMembers] = React.useState<MemberListItem[]>([]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Data
  const { data: membersData, isLoading, isError } = useMembers(filters);
  const { data: stats, isLoading: statsLoading } = useMemberStats();
  const { data: tiers } = useMembershipTiers();
  const deleteMutation = useDeleteMember();
  const updateStatus = useUpdateMemberStatus();

  const members = membersData?.data ?? [];
  const meta = membersData?.meta;

  const columns = React.useMemo(
    () =>
      buildColumns(
        (id) => router.push(`/dashboard/members/${id}`),
        (id) => router.push(`/dashboard/members/${id}/edit`),
        (m) => setDeleteTarget(m),
      ),
    [router],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted`);
    } catch (err) {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : '' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    for (const m of selectedMembers) {
      await updateStatus.mutateAsync({ id: m.id, status }).catch(() => {});
    }
    toast.success(`Status updated for ${selectedMembers.length} member(s)`);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    window.open(`${base}/api/v1/members/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`Manage ${tenant?.name ?? 'your organisation'}'s members`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Members' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/members/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard title="Total Members" value={stats.totalMembers} icon={Users} />
          <StatsCard
            title="Active"
            value={stats.activeMembers}
            icon={UserCheck}
            trend={{ value: stats.growthRate, label: 'vs last month' }}
          />
          <StatsCard title="New This Month" value={stats.newThisMonth} icon={UserPlus} />
          <StatsCard title="Expiring Soon" value={stats.expiringThisMonth} icon={Timer} />
        </div>
      ) : null}

      {/* Filter panel */}
      <div className="rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>Filters</span>
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {filtersOpen && (
          <div className="border-t px-4 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <Input
                  placeholder="Name, email or phone…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={filters.status ?? 'all'}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      status: v === 'all' ? undefined : (v as MemberStatus),
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tier</Label>
                <Select
                  value={filters.membershipTierId ?? 'all'}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      membershipTierId: v === 'all' ? undefined : v,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="All Tiers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {(tiers ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Joined After</Label>
                <Input
                  type="date"
                  value={filters.joinedAfter ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, joinedAfter: e.target.value || undefined, page: 1 }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Joined Before</Label>
                <Input
                  type="date"
                  value={filters.joinedBefore ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, joinedBefore: e.target.value || undefined, page: 1 }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="expiring"
                  checked={!!filters.tierExpiring}
                  onCheckedChange={(v) =>
                    setFilters((f) => ({ ...f, tierExpiring: v || undefined, page: 1 }))
                  }
                />
                <Label htmlFor="expiring" className="text-sm cursor-pointer">Expiring soon</Label>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ page: 1, limit: 20 });
                  setSearchInput('');
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load members. Please refresh.
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <MobileDataTable
          columns={columns}
          data={members}
          searchKey="email"
          searchPlaceholder="Filter by email…"
        />
      )}

      {/* Pagination summary */}
      {meta && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {members.length} of {meta.total} members
        </p>
      )}

      {/* Bulk actions floating bar */}
      <MemberBulkActions
        selectedCount={selectedMembers.length}
        onSendEmail={() => toast.info('Bulk email coming soon')}
        onChangeStatus={handleBulkStatusChange}
        onDelete={() => toast.info('Bulk delete coming soon')}
      />

      {/* Modals */}
      <MemberImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Member"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.firstName} ${deleteTarget.lastName}? This action will anonymise their data.`
            : ''
        }
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
