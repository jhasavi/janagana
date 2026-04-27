import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCheckInSummary } from '@/lib/actions/checkin'
import { CheckInPanel } from './_components/checkin-panel'

export const metadata: Metadata = { title: 'Event Check-In' }

export default async function EventCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getCheckInSummary(id)

  if (!result.success || !result.data) notFound()
  const event = result.data

  const registrations = event.registrations.map((r) => ({
    id: r.id,
    ticketCode: r.ticketCode,
    status: r.status as 'CONFIRMED' | 'CANCELED' | 'ATTENDED' | 'NO_SHOW' | 'WAITLISTED',
    member: {
      id: r.member.id,
      firstName: r.member.firstName,
      lastName: r.member.lastName,
      email: r.member.email,
      avatarUrl: r.member.avatarUrl,
    },
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/events/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Check-In</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{event.title}</p>
        </div>
      </div>

      <CheckInPanel eventId={id} registrations={registrations} />
    </div>
  )
}
