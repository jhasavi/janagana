import type { Metadata } from 'next'
import { JobForm } from '../_components/job-form'

export const metadata: Metadata = { title: 'Post a Job' }

export default function NewJobPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post a Job</h1>
        <p className="text-muted-foreground text-sm mt-1">Publish a job listing for your members and community.</p>
      </div>
      <JobForm />
    </div>
  )
}
