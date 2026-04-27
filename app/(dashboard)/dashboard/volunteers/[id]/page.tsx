import type { Metadata } from 'next'
import type { VolunteerShift } from '@prisma/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Users, Calendar, Pencil } from 'lucide-react'
import { getOpportunity, getShifts } from '@/lib/actions/volunteers'
import { getMembers } from '@/lib/actions/members'
import { formatDate, initials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VolunteerSignupPanel } from './_components/volunteer-signup-panel'
import { HoursApprovalPanel } from './_components/hours-approval-panel'
import { VolunteerShiftsPanel } from './_components/volunteer-shifts-panel'

export const metadata: Metadata = { title: 'Opportunity Detail' }

type ShiftWithCount = VolunteerShift & { _count: { signups: number } }

const statusConfig = {
  OPEN: { label: 'Open', variant: 'success' as const },
  CLOSED: { label: 'Closed', variant: 'secondary' as const },
  COMPLETED: { label: 'Completed', variant: 'info' as const },
  CANCELED: { label: 'Canceled', variant: 'destructive' as const },
}

const signupStatusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'success' as const },
  CANCELED: { label: 'Canceled', variant: 'secondary' as const },
  COMPLETED: { label: 'Completed', variant: 'info' as const },
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [oppResult, membersResult] = await Promise.all([
    getOpportunity(id),
    getMembers({ status: 'ACTIVE' }),
  ])

  if (!oppResult.success || !oppResult.data) notFound()
  const opp = oppResult.data
  const shiftsResult = await getShifts(id)
  const shifts = (shiftsResult.data ?? []) as ShiftWithCount[]
  const allMembers = membersResult.data ?? []

  const status = statusConfig[opp.status]
  const signedUpIds = new Set(opp.signups.map((s) => s.memberId))
  const unsignedMembers = allMembers.filter((m) => !signedUpIds.has(m.id))

  const totalHours = opp.signups.reduce((sum, s) => sum + (s.hoursLogged ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/volunteers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{opp.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/volunteers/${opp.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {opp.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDate(opp.date)}
                      {opp.endDate && ` → ${formatDate(opp.endDate)}`}
                    </span>
                  </div>
                )}
                {opp.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{opp.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {opp._count.signups}
                    {opp.capacity && `/${opp.capacity}`} volunteers
                  </span>
                </div>
                {opp.hoursEstimate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{opp.hoursEstimate}h estimated · {totalHours.toFixed(1)}h logged</span>
                  </div>
                )}
              </div>
              {opp.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                  {opp.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Signups list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Volunteers ({opp._count.signups})</CardTitle>
            </CardHeader>
            <CardContent>
              {opp.signups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No volunteers yet
                </p>
              ) : (
                <div className="space-y-2">
                  {opp.signups.map((signup) => {
                    const signupStatus = signupStatusConfig[signup.status]
                    return (
                      <div
                        key={signup.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={signup.member.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs bg-rose-100 text-rose-700">
                              {initials(signup.member.firstName, signup.member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/dashboard/members/${signup.member.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {signup.member.firstName} {signup.member.lastName}
                            </Link>
                            {signup.hoursLogged && (
                              <p className="text-xs text-muted-foreground">
                                {signup.hoursLogged}h logged
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={signupStatus.variant}>{signupStatus.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sign-up panel + Hours approval */}
        <div className="space-y-4">
          <VolunteerSignupPanel
            opportunityId={opp.id}
            members={unsignedMembers}
            signedUpMembers={opp.signups}
          />
          <HoursApprovalPanel opportunityId={opp.id} signups={opp.signups} />
          <VolunteerShiftsPanel opportunityId={opp.id} initialShifts={shifts} />
        </div>
      </div>
    </div>
  )
}
