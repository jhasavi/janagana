import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import { getJobPostings } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Job Board' }

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  VOLUNTEER: 'Volunteer',
  INTERNSHIP: 'Internship',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PUBLISHED: 'default',
  DRAFT: 'secondary',
  CLOSED: 'outline',
  FILLED: 'outline',
}

export default async function JobsPage() {
  const result = await getJobPostings()
  const jobs = result.data ?? []

  const published = jobs.filter((j) => j.status === 'PUBLISHED').length
  const drafts = jobs.filter((j) => j.status === 'DRAFT').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Board</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default">{published} published</Badge>
            {drafts > 0 && <Badge variant="secondary">{drafts} drafts</Badge>}
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/jobs/new">
            <Plus className="h-4 w-4" />
            Post a Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No job postings yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Post job opportunities for your members and the community to discover.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/jobs/new">
                <Plus className="h-4 w-4" />
                Post your first job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-start gap-4 py-4 px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="font-semibold text-sm hover:underline"
                    >
                      {job.title}
                    </Link>
                    <Badge variant={STATUS_VARIANT[job.status] ?? 'secondary'} className="text-xs">
                      {job.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                    </Badge>
                    {job.isFeatured && <Badge className="text-xs bg-amber-500">Featured</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {job.company && <span>{job.company}</span>}
                    {(job.location || job.isRemote) && (
                      <span>{job.isRemote ? 'Remote' : job.location}</span>
                    )}
                    <span>Posted {formatDistanceToNow(job.createdAt, { addSuffix: true })}</span>
                    {job.expiresAt && (
                      <span>Expires {formatDistanceToNow(job.expiresAt, { addSuffix: true })}</span>
                    )}
                  </div>
                  {job.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs h-5">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/jobs/${job.id}/edit`}>Edit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
