'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { registerMemberForEvent } from '@/lib/actions/events'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Member } from '@prisma/client'

interface EventRegistrationPanelProps {
  eventId: string
  members: Member[]
}

export function EventRegistrationPanel({
  eventId,
  members,
}: EventRegistrationPanelProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleRegister = () => {
    if (!selectedMemberId) return
    startTransition(async () => {
      const result = await registerMemberForEvent(eventId, selectedMemberId)
      if (result.success) {
        toast.success('Member registered for event')
        setSelectedMemberId('')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Register a Member</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All active members are already registered.
          </p>
        ) : (
          <>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={handleRegister}
              disabled={!selectedMemberId || isPending}
            >
              <UserPlus className="h-4 w-4" />
              {isPending ? 'Registering...' : 'Register Member'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
