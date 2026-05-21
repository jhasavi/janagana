'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { resendDonationReceipt } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'

interface Props {
  donationId: string
}

export function DonationReceiptActions({ donationId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendDonationReceipt(donationId)
      if (result.success) {
        toast.success('Donation receipt resent')
        setSent(true)
      } else {
        toast.error(result.error ?? 'Unable to resend receipt')
      }
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={handleResend} disabled={isPending || sent}>
      {sent ? 'Receipt resent' : 'Resend receipt'}
    </Button>
  )
}
