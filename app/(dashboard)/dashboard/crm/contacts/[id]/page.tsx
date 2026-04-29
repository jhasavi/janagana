import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Building2, Linkedin, Edit, Calendar, MessageSquare, DollarSign, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ActivityTimeline } from '../../_components/activity-timeline'
import { ActivityQuickAdd } from '../../_components/activity-quick-add'

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      member: true,
      company: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      deals: {
        orderBy: { createdAt: 'desc' },
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!contact) {
    notFound()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-muted-foreground">{contact.email}</p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/crm/contacts/${contact.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Contact
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.email}</span>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.phone}</span>
                </div>
              )}
              {contact.jobTitle && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Job Title:</span>
                  <span className="text-sm">{contact.jobTitle}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.company.name}</span>
                </div>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                </a>
              )}
              {contact.source && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Source:</span>
                  <Badge variant="outline" className="text-xs">
                    {contact.source}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(contact.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {contact.member && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Member</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/members/${contact.member.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {contact.member.firstName} {contact.member.lastName}
                </Link>
                <Badge variant="success" className="ml-2 text-xs">
                  Active Member
                </Badge>
              </CardContent>
            </Card>
          )}

          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activities & Related */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{contact.activities.length}</p>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{contact.deals.length}</p>
                    <p className="text-xs text-muted-foreground">Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{contact.tasks.length}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Activity Timeline</CardTitle>
              <ActivityQuickAdd contactId={contact.id} />
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={contact.activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
