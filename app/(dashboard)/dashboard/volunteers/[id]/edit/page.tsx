import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOpportunity } from '@/lib/actions/volunteers'
import { VolunteerForm } from '../../_components/volunteer-form'

export const metadata: Metadata = { title: 'Edit Opportunity' }

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOpportunity(id)
  if (!result.success || !result.data) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Edit Opportunity</h1>
      <VolunteerForm opportunity={result.data} />
    </div>
  )
}
