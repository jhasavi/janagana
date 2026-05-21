import { notFound } from 'next/navigation'
import Link from 'next/link'
import { QrCode, Calendar, Heart, Star, CheckCircle2, CreditCard, MessageSquare, UserRoundPen, ArrowRight, DollarSign } from 'lucide-react'
import { getPortalContext } from '@/lib/actions/portal'
import { QRCodeDisplay } from '@/components/dashboard/qr-code-display'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  const { member } = ctx

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
    ACTIVE: { label: 'Active', variant: 'success' },
    PENDING: { label: 'Pending Approval', variant: 'warning' },
    INACTIVE: { label: 'Inactive', variant: 'secondary' },
    BANNED: { label: 'Suspended', variant: 'destructive' },
  }
  const status = statusConfig[member.status] ?? statusConfig.INACTIVE
  const paidMembershipNeedsBilling = !!member.tier && member.tier.priceCents > 0 && !member.stripeSubscriptionId
  const renewalDueSoon = !!member.renewsAt && member.renewsAt.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000

  const ticketedRegistrations = (member.eventRegistrations ?? []).filter(
    (registration) => registration.event && registration.ticketCode
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {member.firstName}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 border-indigo-200 bg-indigo-50/60">
          <CardHeader>
            <CardTitle className="text-base">Your next best actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant={paidMembershipNeedsBilling || renewalDueSoon ? 'default' : 'outline'} className="justify-between">
              <Link href={`/portal/${slug}/membership`}>
                <span className="inline-flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Membership
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/portal/${slug}/events`}>
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Events
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/portal/${slug}/profile/edit`}>
                <span className="inline-flex items-center gap-2">
                  <UserRoundPen className="h-4 w-4" />
                  Profile
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/portal/${slug}/donations`}>
                <span className="inline-flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Donations
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/portal/${slug}/support`}>
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Support
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Membership card */}
        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {member.firstName} {member.lastName}
                    </h2>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {member.tier && (
                    <Badge variant="outline">{member.tier.name} Plan</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Member since</span>
                    <p className="font-medium">{formatDate(member.joinedAt)}</p>
                  </div>
                  {member.renewsAt && (
                    <div>
                      <span className="text-muted-foreground">Renews</span>
                      <p className="font-medium">{formatDate(member.renewsAt)}</p>
                    </div>
                  )}
                  {member.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p className="font-medium">{member.phone}</p>
                    </div>
                  )}
                </div>
              </div>
              {ticketedRegistrations.length === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white border rounded-xl shadow-sm">
                    <QRCodeDisplay value={member.id} size={120} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your member QR code for general portal access
                  </p>
                </div>
              ) : null}
            </div>

            {ticketedRegistrations.length > 0 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Event ticket codes</p>
                  <p className="text-xs text-muted-foreground">Show the event-specific QR code below at check-in.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {ticketedRegistrations.map((registration) => (
                    <div key={registration.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{registration.event?.title ?? 'Event ticket'}</p>
                          <p className="text-xs text-muted-foreground">
                            {registration.status} • {registration.event?.startDate ? formatDate(registration.event.startDate) : 'Date pending'}
                          </p>
                        </div>
                        <div className="p-2 bg-white border rounded-xl">
                          <QRCodeDisplay value={registration.ticketCode} size={92} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground break-all">{registration.ticketCode}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier benefits */}
        {member.tier && member.tier.benefits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                {member.tier.name} Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {member.tier.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {b}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Activity summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Events registered
              </span>
              <span className="font-medium">{member.eventRegistrations?.length ?? 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-3.5 w-3.5" /> Volunteer signups
              </span>
              <span className="font-medium">{member.volunteerSignups?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
