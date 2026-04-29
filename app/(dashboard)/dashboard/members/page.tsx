import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { getMembers, getTiers, getMemberStats } from '@/lib/actions/members'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MemberTable } from './_components/member-table'
import { MemberFilters } from './_components/member-filters'
import { ExportCsvButton, ImportCsvDialog } from './_components/csv-import-dialog'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Organization Members' }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; tier?: string }>
}) {
  const params = await searchParams
  const [membersResult, tiersResult, statsResult] = await Promise.all([
    getMembers({ search: params.search, status: params.status, tierId: params.tier }),
    getTiers(),
    getMemberStats(),
  ])

  const members = membersResult.data ?? []
  const tiers = tiersResult.data ?? []
  const stats = statsResult.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              People who have signed up for your organization (may have paid memberships)
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{stats?.total ?? 0} total</Badge>
              <Badge variant="success">{stats?.active ?? 0} active</Badge>
              {(stats?.pending ?? 0) > 0 && (
                <Badge variant="warning">{stats?.pending} pending</Badge>
              )}
            </div>
          </div>
          <HelpButton
            title="Member Management"
            content="Manage your organization members, create membership tiers, and track member activity. Members can access the portal to register for events and view their membership status."
            link="/dashboard/help/members/member-management"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton />
          <ImportCsvDialog />
          <Button asChild>
            <Link href="/dashboard/members/new">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <MemberFilters tiers={tiers} />

      {/* Table */}
      <MemberTable members={members} />
    </div>
  )
}
