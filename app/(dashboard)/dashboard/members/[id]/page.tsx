import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Pencil,
  FolderOpen,
} from 'lucide-react'
import { getMember } from '@/lib/actions/members'
import { getMemberDocuments } from '@/lib/actions/documents'
import { formatDate, formatDateTime, initials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { QRCodeDisplay } from '@/components/dashboard/qr-code-display'
import { MemberDocuments } from './_components/member-documents'

export const metadata: Metadata = { title: 'Member Detail' }

const statusConfig = {
  ACTIVE: { label: 'Active', variant: 'success' as const },
  INACTIVE: { label: 'Inactive', variant: 'secondary' as const },
  PENDING: { label: 'Pending', variant: 'warning' as const },
  BANNED: { label: 'Banned', variant: 'destructive' as const },
}

const regStatusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'success' as const },
  CANCELED: { label: 'Canceled', variant: 'secondary' as const },
  ATTENDED: { label: 'Attended', variant: 'info' as const },
  NO_SHOW: { label: 'No Show', variant: 'destructive' as const },
  WAITLISTED: { label: 'Waitlisted', variant: 'warning' as const },
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [result, docsResult] = await Promise.all([
    getMember(id),
    getMemberDocuments(id),
  ])

  if (!result.success || !result.data) notFound()
  const member = result.data
  const docs = docsResult.data ?? []
  const status = statusConfig[member.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={member.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
              {initials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={status.variant}>{status.label}</Badge>
              {member.tier && (
                <Badge variant="outline">{member.tier.name}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/members/${member.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact + details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
              {member.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${member.phone}`} className="hover:underline">
                    {member.phone}
                  </a>
                </div>
              )}
              {(member.address || member.city) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {member.address && <p>{member.address}</p>}
                    <p>
                      {[member.city, member.state, member.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {member.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {member.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Event registrations */}
          {member.eventRegistrations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-base">Recent Events</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.eventRegistrations.map((reg) => {
                  const regStatus = regStatusConfig[reg.status]
                  return (
                    <div key={reg.id} className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/dashboard/events/${reg.event.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {reg.event.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(reg.event.startDate)}
                        </p>
                      </div>
                      <Badge variant={regStatus.variant}>{regStatus.label}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Volunteer signups */}
          {member.volunteerSignups.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <CardTitle className="text-base">Volunteer Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.volunteerSignups.map((signup) => (
                  <div key={signup.id} className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/dashboard/volunteers/${signup.opportunity.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {signup.opportunity.title}
                      </Link>
                      {signup.hoursLogged && (
                        <p className="text-xs text-muted-foreground">
                          {signup.hoursLogged}h logged
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        signup.status === 'COMPLETED' ? 'success' : 'secondary'
                      }
                    >
                      {signup.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Documents</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <MemberDocuments memberId={member.id} initialDocs={docs} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membership Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">{formatDate(member.joinedAt)}</span>
              </div>
              {member.renewsAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renews</span>
                  <span className="font-medium">{formatDate(member.renewsAt)}</span>
                </div>
              )}
              {member.tier && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier</span>
                    <span className="font-medium">{member.tier.name}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDate(member.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {member.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {member.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Member QR Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <QRCodeDisplay value={member.id} size={160} />
              <p className="text-xs text-muted-foreground text-center">
                Scan to identify this member at events
              </p>
              <code className="text-xs bg-muted rounded px-2 py-1 break-all text-center">
                {member.id}
              </code>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
