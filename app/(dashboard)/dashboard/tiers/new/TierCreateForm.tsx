'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Loader2, PlusCircle } from 'lucide-react'
import { createTier } from '@/lib/actions/members'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const COLOR_PRESETS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#16A34A', '#0891B2', '#0369A1', '#374151', '#1E293B',
]

export default function TierCreateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('Annual Member')
  const [description, setDescription] = useState('Full access for the year.')
  const [price, setPrice] = useState('0')
  const [interval, setInterval] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL')
  const [color, setColor] = useState('#4F46E5')
  const [benefits, setBenefits] = useState('Access to all events\nMember newsletter')
  const [stripePriceId, setStripePriceId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buttonLabel = useMemo(() => {
    if (isPending) return 'Creating…'
    return 'Create Tier'
  }, [isPending])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const priceCents = Math.round(parseFloat(price || '0') * 100)
    if (!name.trim()) {
      setError('Tier name is required')
      return
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Enter a valid price')
      return
    }

    startTransition(async () => {
      const result = await createTier({
        name: name.trim(),
        description: description.trim() || undefined,
        priceCents,
        interval,
        color,
        benefits: benefits.split('\n').map((value) => value.trim()).filter(Boolean),
        stripePriceId: stripePriceId.trim() || undefined,
        isActive,
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to create tier')
        return
      }

      toast.success('Tier created')
      router.push('/dashboard/settings#tiers')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create a new membership tier</CardTitle>
            <CardDescription>Use this page to add a tier without opening Settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tier-name">Tier name</Label>
                  <Input id="tier-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier-price">Price</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input id="tier-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <span className="text-sm text-muted-foreground">/ {interval === 'MONTHLY' ? 'month' : 'year'}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tier-interval">Billing interval</Label>
                  <Select value={interval} onValueChange={(value) => setInterval(value as 'MONTHLY' | 'ANNUAL')}>
                    <SelectTrigger id="tier-interval">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-price-id">Stripe Price ID</Label>
                  <Input id="stripe-price-id" value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} placeholder="price_..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier-description">Description</Label>
                <Textarea id="tier-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier-benefits">Benefits</Label>
                <Textarea id="tier-benefits" value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={4} placeholder="One benefit per line" />
              </div>

              <div className="flex items-center gap-3">
                <Label>Tier color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 ${color === value ? 'border-foreground scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: value }}
                      onClick={() => setColor(value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm text-muted-foreground">Active tier</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" className="flex items-center gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  {buttonLabel}
                </Button>
                <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
