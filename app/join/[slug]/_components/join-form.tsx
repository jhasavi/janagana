'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { portalJoinRequest } from '@/lib/actions/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface Tier {
  id: string
  name: string
  priceCents: number
  interval: string | null
  description: string | null
}

interface JoinFormProps {
  slug: string
  orgName: string
  primaryColor: string
  tiers: Tier[]
}

export function JoinForm({ slug, orgName, primaryColor, tiers }: JoinFormProps) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [tierId, setTierId] = useState<string>(tiers[0]?.id ?? '')
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await portalJoinRequest(slug, {
        ...form,
        tierId: tierId || undefined,
        smsOptIn,
      })
      if (result.success) {
        setDone(true)
      } else {
        toast.error(result.error ?? 'Failed to submit join request')
      }
    })
  }

  if (done) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Request submitted!</h2>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm">
          Your membership request for <strong>{orgName}</strong> has been received.
          The admin will review it and you&apos;ll get an email when you&apos;re approved.
        </p>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full" style={{ backgroundColor: primaryColor || '#4f46e5' }} />
          <span className="font-semibold">{orgName}</span>
        </div>
        <CardTitle className="text-xl">Become a Member</CardTitle>
        <CardDescription>Fill out your details to request membership.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" name="firstName" required value={form.firstName} onChange={handleChange} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" name="lastName" required value={form.lastName} onChange={handleChange} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required value={form.email} onChange={handleChange} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={isPending} />
          </div>
          {tiers.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="tier">Membership plan</Label>
              <Select value={tierId} onValueChange={setTierId} disabled={isPending}>
                <SelectTrigger id="tier">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.priceCents > 0
                        ? ` — ${formatCurrency(t.priceCents)}/${t.interval === 'MONTHLY' ? 'mo' : 'yr'}`
                        : ' — Free'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              disabled={isPending}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I agree to receive occasional SMS updates from {orgName}. You can opt out anytime.
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Request Membership'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
