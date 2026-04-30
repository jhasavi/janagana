import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, FileText, CheckCircle, XCircle, Clock, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SUBMITTED:     { label: 'Submitted',     className: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW:  { label: 'Under Review',  className: 'bg-yellow-100 text-yellow-800' },
  INTERVIEW:     { label: 'Interview',     className: 'bg-purple-100 text-purple-800' },
  OFFER:         { label: 'Offer',         className: 'bg-indigo-100 text-indigo-800' },
  HIRED:         { label: 'Hired',         className: 'bg-green-100 text-green-800' },
  REJECTED:      { label: 'Rejected',      className: 'bg-red-100 text-red-800' },
  WITHDRAWN:     { label: 'Withdrawn',     className: 'bg-gray-100 text-gray-800' },
}

export default async function JobApplicationsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const applications = await prisma.jobApplication.findMany({
    where: { tenantId: tenant.id },
    include: {
      jobPosting: { select: { id: true, title: true, company: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  const counts = {
    total: applications.length,
    submitted: applications.filter((a) => a.status === 'SUBMITTED').length,
    inProgress: applications.filter((a) =>
      ['UNDER_REVIEW', 'INTERVIEW', 'OFFER'].includes(a.status)
    ).length,
    hired: applications.filter((a) => a.status === 'HIRED').length,
    rejected: applications.filter((a) => a.status === 'REJECTED').length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-600" />
            Job Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Applicant intake for paid positions. Separate from volunteer signups.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/jobs">
            <Briefcase className="h-4 w-4 mr-2" />
            View Job Postings
          </Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total', value: counts.total, icon: FileText, color: 'text-gray-600' },
          { label: 'New', value: counts.submitted, icon: Clock, color: 'text-blue-600' },
          { label: 'In Progress', value: counts.inProgress, icon: Search, color: 'text-yellow-600' },
          { label: 'Hired', value: counts.hired, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'text-red-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.label}
              </CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Applications table */}
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>
            Review, advance, or reject candidates. On hire, link them to a Contact record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">
                Applications appear here when candidates apply through your public job listings.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/jobs">Manage Job Postings</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact Linked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.SUBMITTED
                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {app.firstName} {app.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{app.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/jobs/${app.jobPostingId}`}
                          className="hover:underline"
                        >
                          {app.jobPosting.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {app.jobPosting.company ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {app.contact ? (
                          <Link
                            href={`/dashboard/crm/contacts/${app.contactId}`}
                            className="text-indigo-600 hover:underline text-sm"
                          >
                            {app.contact.firstName} {app.contact.lastName}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/jobs/applications/${app.id}`}>
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Design note */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Workflow note:</strong> Applicants are tracked independently from Contacts until hiring
            is confirmed. On hire, use the &ldquo;Convert to Contact&rdquo; action to create or link a Contact record
            and optionally create an Employee record. This preserves the full application history.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
