import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApplicationActions } from './_components/application-actions'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800' },
  INTERVIEW:    { label: 'Interview',    className: 'bg-purple-100 text-purple-800' },
  OFFER:        { label: 'Offer',        className: 'bg-indigo-100 text-indigo-800' },
  HIRED:        { label: 'Hired',        className: 'bg-green-100 text-green-800' },
  REJECTED:     { label: 'Rejected',     className: 'bg-red-100 text-red-800' },
  WITHDRAWN:    { label: 'Withdrawn',    className: 'bg-gray-100 text-gray-800' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const application = await prisma.jobApplication.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      jobPosting: { select: { id: true, title: true, jobType: true } },
      contact:    { select: { id: true, firstName: true, lastName: true, emails: true, email: true, phone: true, phones: true } },
    },
  })

  if (!application) notFound()

  const statusCfg = STATUS_CONFIG[application.status] ?? { label: application.status, className: 'bg-gray-100 text-gray-800' }
  const applicantEmail = application.email ?? '—'
  const applicantPhone = application.phone ?? '—'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/jobs/applications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {application.firstName} {application.lastName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Applied for{' '}
            <Link
              href={`/dashboard/jobs/${application.jobPostingId}`}
              className="underline hover:no-underline"
            >
              {application.jobPosting?.title ?? 'Unknown Position'}
            </Link>
          </p>
        </div>
        <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span>{' '}
              {applicantEmail !== '—' ? (
                <a href={`mailto:${applicantEmail}`} className="underline">{applicantEmail}</a>
              ) : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span> {applicantPhone}
            </p>
            <p>
              <span className="text-muted-foreground">Source:</span> {application.source ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Submitted:</span>{' '}
              {format(application.submittedAt, 'PPP')}
            </p>
            {application.reviewedAt && (
              <p>
                <span className="text-muted-foreground">Reviewed:</span>{' '}
                {format(application.reviewedAt, 'PPP')}
              </p>
            )}
            {application.hiredAt && (
              <p>
                <span className="text-muted-foreground">Hired:</span>{' '}
                {format(application.hiredAt, 'PPP')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Linked Contact</CardTitle>
          </CardHeader>
          <CardContent>
            {application.contact ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {application.contact.firstName} {application.contact.lastName}
                </p>
                <p className="text-muted-foreground">
                  {application.contact.emails?.[0] ?? application.contact.email ?? '—'}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/dashboard/crm/contacts/${application.contact.id}`}>
                    <User className="h-4 w-4 mr-2" />
                    View Contact
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>No contact linked yet.</p>
                <p className="text-xs">
                  Convert to create a People record and link to this application.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {application.resumeUrl && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Resume
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {application.coverLetter && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cover Letter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{application.coverLetter}</p>
          </CardContent>
        </Card>
      )}

      {application.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
          </CardContent>
        </Card>
      )}

      {application.rejectionReason && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{application.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <ApplicationActions
        applicationId={application.id}
        currentStatus={application.status}
        hasContact={!!application.contactId}
      />
    </div>
  )
}
