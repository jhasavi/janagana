import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { VolunteerForm } from '../_components/volunteer-form'

export const metadata: Metadata = { title: 'New Volunteer Opportunity' }

export default async function NewOpportunityPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  return <VolunteerForm />
}
