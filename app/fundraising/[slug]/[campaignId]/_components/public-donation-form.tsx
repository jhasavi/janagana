'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { HeartHandshake, Loader2 } from 'lucide-react'
import { createDonationCheckoutSession } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const presetAmounts = [2500, 5000, 10000, 25000]

export function PublicDonationForm({ slug, campaignId }: { slug: string; campaignId: string }) {
  const [amountCents, setAmountCents] = useState(5000)
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDonate() {
    startTransition(async () => {
      const result = await createDonationCheckoutSession(slug, campaignId, {
        amountCents,
        donorName,
        donorEmail,
        message,
        isAnonymous,
      })

      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error ?? 'Unable to start donation checkout')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-emerald-600" />
          <CardTitle>Make a donation</CardTitle>
        </div>
        <CardDescription>Secure checkout is handled by Stripe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={amountCents === amount ? 'default' : 'outline'}
              onClick={() => setAmountCents(amount)}
            >
              ${(amount / 100).toFixed(0)}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="custom-amount">Custom amount</Label>
          <Input
            id="custom-amount"
            type="number"
            min="1"
            step="1"
            value={amountCents / 100}
            onChange={(event) => setAmountCents(Math.max(100, Math.round(Number(event.target.value || 0) * 100)))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="donor-name">Name</Label>
          <Input id="donor-name" value={donorName} onChange={(event) => setDonorName(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="donor-email">Email</Label>
          <Input id="donor-email" type="email" value={donorEmail} onChange={(event) => setDonorEmail(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="donor-message">Message</Label>
          <Textarea id="donor-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
          />
          Show my donation as anonymous
        </label>

        <Button className="w-full" onClick={handleDonate} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Donate securely
        </Button>
      </CardContent>
    </Card>
  )
}
