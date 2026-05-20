'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createTier, deleteTier, updateTier } from '@/lib/actions/members'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type BillingInterval = 'MONTHLY' | 'ANNUAL'

interface Tier {
  id: string
  name: string
  description: string | null
  priceCents: number
  interval: BillingInterval
  color: string
  benefits: string[]
  isActive: boolean
  _count?: {
    members: number
    enrollments?: number
  }
}

interface TierFormState {
  name: string
  description: string
  price: string
  interval: BillingInterval
  color: string
  benefits: string
  isActive: boolean
}

interface MembershipTiersManagerProps {
  initialTiers: Tier[]
}

const emptyForm: TierFormState = {
  name: '',
  description: '',
  price: '0',
  interval: 'ANNUAL',
  color: '#4F46E5',
  benefits: '',
  isActive: true,
}

function formatPrice(priceCents: number, interval: BillingInterval) {
  if (priceCents === 0) return 'Free'
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceCents / 100)
  return `${amount} / ${interval === 'MONTHLY' ? 'month' : 'year'}`
}

function dollarsToCents(value: string) {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * 100)
}

function tierToForm(tier: Tier): TierFormState {
  return {
    name: tier.name,
    description: tier.description ?? '',
    price: String(tier.priceCents / 100),
    interval: tier.interval,
    color: tier.color,
    benefits: tier.benefits.join('\n'),
    isActive: tier.isActive,
  }
}

export function MembershipTiersManager({ initialTiers }: MembershipTiersManagerProps) {
  const router = useRouter()
  const [tiers, setTiers] = useState(initialTiers)
  const [open, setOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [form, setForm] = useState<TierFormState>(emptyForm)
  const [tierToDelete, setTierToDelete] = useState<Tier | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setTiers(initialTiers)
  }, [initialTiers])

  function openCreate() {
    setEditingTier(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(tier: Tier) {
    setEditingTier(tier)
    setForm(tierToForm(tier))
    setOpen(true)
  }

  function updateForm<K extends keyof TierFormState>(key: K, value: TierFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function saveTier() {
    const priceCents = dollarsToCents(form.price)
    if (priceCents === null) {
      toast.error('Enter a valid price')
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      priceCents,
      interval: form.interval,
      color: form.color,
      benefits: form.benefits
        .split('\n')
        .map((benefit) => benefit.trim())
        .filter(Boolean),
      isActive: form.isActive,
    }

    startTransition(async () => {
      const result = editingTier
        ? await updateTier(editingTier.id, payload)
        : await createTier(payload)

      if (!result.success) {
        toast.error(result.error ?? 'Could not save tier')
        return
      }

      toast.success(editingTier ? 'Tier updated' : 'Tier created')
      setOpen(false)
      setEditingTier(null)
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!tierToDelete) return

    startTransition(async () => {
      const result = await deleteTier(tierToDelete.id)
      if (!result.success) {
        toast.error(result.error ?? 'Could not delete tier')
        return
      }

      setTiers((current) => current.filter((tier) => tier.id !== tierToDelete.id))
      setTierToDelete(null)
      toast.success('Tier deleted')
      router.refresh()
    })
  }

  return (
    <section id="tiers" className="space-y-3 scroll-mt-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Membership Tiers</h2>
          <p className="text-sm text-muted-foreground">
            Define the plans members can choose when they join or renew.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">No membership tiers yet.</p>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tiers.map((tier) => (
            <Card key={tier.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="truncate">{tier.name}</span>
                    {!tier.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(tier.priceCents, tier.interval)}
                    {typeof tier._count?.members === 'number'
                      ? ` · ${(tier._count.members ?? 0) + (tier._count.enrollments ?? 0)} assignments`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => openEdit(tier)} aria-label={`Edit ${tier.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => setTierToDelete(tier)} aria-label={`Delete ${tier.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {(tier.description || tier.benefits.length > 0) && (
                <CardContent className="space-y-2 pt-0">
                  {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
                  {tier.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tier.benefits.map((benefit) => (
                        <Badge key={benefit} variant="outline">{benefit}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Membership Tier' : 'Add Membership Tier'}</DialogTitle>
            <DialogDescription>
              These tiers appear in member forms and the public join flow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tier-name">Name</Label>
              <Input id="tier-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-description">Description</Label>
              <Textarea
                id="tier-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-price">Price</Label>
                <Input
                  id="tier-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => updateForm('price', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Billing</Label>
                <Select value={form.interval} onValueChange={(value) => updateForm('interval', value as BillingInterval)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-color">Color</Label>
                <Input
                  id="tier-color"
                  type="color"
                  value={form.color}
                  onChange={(event) => updateForm('color', event.target.value)}
                  className="h-10 p-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-benefits">Benefits</Label>
              <Textarea
                id="tier-benefits"
                value={form.benefits}
                onChange={(event) => updateForm('benefits', event.target.value)}
                placeholder="One benefit per line"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="tier-active" className="text-sm">Active</Label>
              <Switch id="tier-active" checked={form.isActive} onCheckedChange={(checked) => updateForm('isActive', checked)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveTier} disabled={isPending || form.name.trim().length === 0}>
              {isPending ? 'Saving...' : 'Save Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(tierToDelete)} onOpenChange={(nextOpen) => !nextOpen && setTierToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Membership Tier</DialogTitle>
            <DialogDescription>
              Members currently using this tier will keep their membership record, but the tier assignment will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTierToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
