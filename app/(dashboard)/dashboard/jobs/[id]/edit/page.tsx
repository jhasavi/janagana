import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getJobPosting } from '@/lib/actions/jobs'
import { JobForm } from '../../_components/job-form'

export const metadata: Metadata = { title: 'Edit Job' }

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getJobPosting(id)
  if (!result.success || !result.data) notFound()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Job Posting</h1>
        <p className="text-muted-foreground text-sm mt-1">{result.data.title}</p>
      </div>
      <JobForm job={result.data} />
    </div>
  )
}
