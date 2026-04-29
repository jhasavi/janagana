import type { Metadata } from 'next'
import Link from 'next/link'
import { HeartHandshake } from 'lucide-react'
import { getOpportunities, getVolunteerStats } from '@/lib/actions/volunteers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VolunteerList } from './_components/volunteer-list'
import { VolunteerFilters } from './_components/volunteer-filters'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Volunteers' }

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const [oppsResult, statsResult] = await Promise.all([
    getOpportunities({ search: params.search, status: params.status }),
    getVolunteerStats(),
  ])

  const opportunities = oppsResult.data ?? []
  const stats = statsResult.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Volunteers</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{stats?.totalOpportunities ?? 0} opportunities</Badge>
              <Badge variant="success">{stats?.openOpportunities ?? 0} open</Badge>
              <Badge variant="info">{stats?.totalSignups ?? 0} signups</Badge>
              <Badge variant="warning">{(stats?.totalHours ?? 0).toFixed(0)}h logged</Badge>
            </div>
          </div>
          <HelpButton
            title="Volunteer Management"
            content="Create volunteer opportunities and track signups. Volunteers can sign up through the member portal, and you can track their hours and contributions."
            link="/dashboard/help/volunteers/create-volunteer-opportunity"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/volunteers/new">
            <HeartHandshake className="h-4 w-4" />
            New Opportunity
          </Link>
        </Button>
      </div>

      <VolunteerFilters />

      <VolunteerList opportunities={opportunities} />
    </div>
  )
}
