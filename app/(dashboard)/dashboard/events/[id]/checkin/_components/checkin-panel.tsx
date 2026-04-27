'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Search, RotateCcw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { checkInByTicketCode, markAttended, undoCheckIn } from '@/lib/actions/checkin'
import { initials } from '@/lib/utils'

type Registration = {
  id: string
  ticketCode: string
  status: 'CONFIRMED' | 'CANCELED' | 'ATTENDED' | 'NO_SHOW' | 'WAITLISTED'
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
}

interface CheckInPanelProps {
  eventId: string
  registrations: Registration[]
}

export function CheckInPanel({ eventId, registrations: initial }: CheckInPanelProps) {
  const [registrations, setRegistrations] = useState(initial)
  const [ticketInput, setTicketInput] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const attended = registrations.filter((r) => r.status === 'ATTENDED').length
  const total = registrations.length

  function updateStatus(id: string, status: Registration['status']) {
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketInput.trim()) return
    startTransition(async () => {
      const res = await checkInByTicketCode(ticketInput.trim())
      if (res.success && res.data) {
        updateStatus(res.data.id, 'ATTENDED')
        toast.success(
          `✓ Checked in: ${res.data.member.firstName} ${res.data.member.lastName}`
        )
        setTicketInput('')
      } else {
        toast.error(res.error ?? 'Check-in failed')
      }
    })
  }

  function handleMarkAttended(regId: string) {
    startTransition(async () => {
      const res = await markAttended(regId)
      if (res.success) {
        updateStatus(regId, 'ATTENDED')
        toast.success('Marked as attended')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  function handleUndo(regId: string) {
    startTransition(async () => {
      const res = await undoCheckIn(regId)
      if (res.success) {
        updateStatus(regId, 'CONFIRMED')
        toast.success('Check-in undone')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.member.firstName.toLowerCase().includes(q) ||
      r.member.lastName.toLowerCase().includes(q) ||
      r.member.email.toLowerCase().includes(q) ||
      r.ticketCode.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{attended}</div>
            <div className="text-sm text-muted-foreground mt-1">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{total - attended}</div>
            <div className="text-sm text-muted-foreground mt-1">Remaining</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground mt-1">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket code scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan / Enter Ticket Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTicketSubmit} className="flex gap-2">
            <Input
              placeholder="Enter ticket code..."
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className="font-mono"
              autoFocus
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !ticketInput.trim()}>
              <Search className="h-4 w-4 mr-1" />
              Check In
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Scan a member&apos;s QR code or type the ticket code from their registration.
          </p>
        </CardContent>
      </Card>

      {/* Attendee list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Registrations</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 w-48 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No registrations found
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((reg) => (
                <div key={reg.id} className="flex items-center gap-3 px-6 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reg.member.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initials(reg.member.firstName, reg.member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reg.member.firstName} {reg.member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {reg.ticketCode}
                    </p>
                  </div>
                  {reg.status === 'ATTENDED' ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Attended
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleUndo(reg.id)}
                        disabled={isPending}
                        title="Undo check-in"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleMarkAttended(reg.id)}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Check In
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
