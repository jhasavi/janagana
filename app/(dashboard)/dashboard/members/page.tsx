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

export const metadata: Metadata = { title: 'Memberships' }

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
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Understanding People vs Memberships</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              <strong>People</strong> are your master contact records - individuals who engage with your organization in any way (donors, volunteers, event attendees, etc.). 
              <strong>Memberships</strong> are enrollment records that link people to membership tiers. A person can have multiple memberships over time, but only one active membership at a time.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Memberships</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage membership enrollments and tiers. People can have multiple membership enrollments over time.
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
            title="Membership Management"
            content="Manage membership enrollments, create membership tiers, and track membership activity. Memberships are enrollment records linked to people in the People section."
            link="/dashboard/help/members/membership-management"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton />
          <ImportCsvDialog />
          <Button asChild>
            <Link href="/dashboard/members/new">
              <UserPlus className="h-4 w-4" />
              Add Membership
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
