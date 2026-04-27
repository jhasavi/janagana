import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, ExternalLink, Mail, MapPin, Briefcase, Calendar, DollarSign, Tag } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { getJobPosting } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  CLOSED: 'outline',
  FILLED: 'default',
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  VOLUNTEER: 'Volunteer',
  INTERNSHIP: 'Internship',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getJobPosting(id)
  if (!result.success || !result.data) notFound()
  const job = result.data

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <Badge variant={STATUS_VARIANT[job.status] ?? 'secondary'}>
              {job.status}
            </Badge>
            {job.isFeatured && <Badge className="bg-amber-500 hover:bg-amber-500">Featured</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Posted {formatDistanceToNow(job.createdAt, { addSuffix: true })}
          </p>
        </div>
        <Link href={`/dashboard/jobs/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {job.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span>{job.company}</span>
              </div>
            )}
            {(job.location || job.isRemote) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{job.isRemote ? 'Remote' : job.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              <span>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</span>
            </div>
            {(job.salaryMin || job.salaryMax) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 shrink-0" />
                <span>
                  {job.salaryMin && job.salaryMax
                    ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
                    : job.salaryMin
                    ? `From $${job.salaryMin.toLocaleString()}`
                    : `Up to $${job.salaryMax?.toLocaleString()}`}
                </span>
              </div>
            )}
            {job.expiresAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Expires {format(job.expiresAt, 'PPP')}</span>
              </div>
            )}
          </div>

          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {job.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {job.description}
          </div>
        </CardContent>
      </Card>

      {/* Apply info */}
      {(job.applyUrl || job.applyEmail) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to Apply</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {job.applyUrl && (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Apply Online
              </a>
            )}
            {job.applyEmail && (
              <a
                href={`mailto:${job.applyEmail}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {job.applyEmail}
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
