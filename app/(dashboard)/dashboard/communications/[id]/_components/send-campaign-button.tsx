'use client'

import { useState, useTransition } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { sendEmailCampaign } from '@/lib/actions/communications'
import { Button } from '@/components/ui/button'

interface SendCampaignButtonProps {
  campaignId: string
  recipientPreview?: number
}

export function SendCampaignButton({ campaignId, recipientPreview }: SendCampaignButtonProps) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!confirm(`Send this campaign now to ${recipientPreview ?? 'matching'} members? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await sendEmailCampaign(campaignId)
      if (result.success && 'data' in result && result.data) {
        toast.success(`Campaign sent to ${result.data.sent} members!`)
        setDone(true)
      } else {
        toast.error((result as { error?: string }).error ?? 'Failed to send campaign')
      }
    })
  }

  if (done) return null

  return (
    <Button onClick={handleSend} disabled={isPending}>
      {isPending ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
      ) : (
        <><Send className="h-4 w-4" /> Send Now</>
      )}
    </Button>
  )
}
