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
import { Card, CardContent } from '@/components/ui/card'

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
      <Card className="border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/50">
        <CardContent className="pt-5 text-sm text-blue-900 dark:text-blue-100">
          Memberships are enrollment records linked to contacts. Add a contact first, or create one while adding a membership.{' '}
          <Link href="/dashboard/help/crm/add-manage-contacts" className="underline underline-offset-4">
            Learn how Contacts and Memberships work
          </Link>
          .
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Memberships</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage enrollment records linked to contacts and membership tiers.
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
            content="Manage membership enrollments, create membership tiers, and track membership activity. Memberships are linked to contacts and should not be the first place to create a person."
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
