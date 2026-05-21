'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { sendRenewalEmailReminders } from '@/lib/actions/members'
import { Button } from '@/components/ui/button'

export function RenewalReminderButton() {
  const [isPending, startTransition] = useTransition()
  const [sentCount, setSentCount] = useState<number | null>(null)

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendRenewalEmailReminders()
      if (result.success) {
        const count = result.data?.sent ?? 0
        toast.success(`Sent ${count} renewal reminder${count === 1 ? '' : 's'}`)
        setSentCount(count)
      } else {
        toast.error(result.error ?? 'Failed to send reminders')
      }
    })
  }

  return (
    <Button onClick={handleSend} disabled={isPending} size="sm">
      {isPending ? 'Sending…' : sentCount !== null ? `Sent ${sentCount}` : 'Send renewal reminders'}
    </Button>
  )
}
