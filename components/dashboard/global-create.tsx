'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  quickCreateCompany,
  quickCreateContact,
  quickCreateDeal,
  quickCreateEvent,
  quickCreateMembership,
  quickCreateTask,
  quickRecordDonation,
} from '@/lib/actions/quick-create'

type CreateKind =
  | 'contact'
  | 'company'
  | 'membership'
  | 'event'
  | 'donation'
  | 'deal'
  | 'task'

const createOptions: Array<{ value: CreateKind; label: string }> = [
  { value: 'contact', label: 'Add Contact' },
  { value: 'company', label: 'Add Company' },
  { value: 'membership', label: 'Add Membership' },
  { value: 'event', label: 'Create Event' },
  { value: 'donation', label: 'Record Donation' },
  { value: 'deal', label: 'Create Deal' },
  { value: 'task', label: 'Create Task' },
]

export function GlobalCreate() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CreateKind>('contact')
  const [isSubmitting, startTransition] = useTransition()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [amount, setAmount] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [value, setValue] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const actionLabel = useMemo(() => {
    const match = createOptions.find((option) => option.value === kind)
    return match?.label ?? 'Create'
  }, [kind])

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setTitle('')
    setName('')
    setStartDate('')
    setAmount('')
    setCampaignId('')
    setValue('')
    setContactEmail('')
  }

  const onSubmit = () => {
    startTransition(async () => {
      if (kind === 'contact') {
        const result = await quickCreateContact({ firstName, lastName, email, phone: phone || undefined })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create contact')
          return
        }
        toast.success('Contact created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/crm/contacts/${result.data.id}`)
        router.refresh()
        return
      }

      if (kind === 'company') {
        const result = await quickCreateCompany({ name })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create company')
          return
        }
        toast.success('Company created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/crm/companies/${result.data.id}`)
        router.refresh()
        return
      }

      if (kind === 'membership') {
        const result = await quickCreateMembership({ firstName, lastName, email })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create membership')
          return
        }
        toast.success('Membership created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/members/${result.data.id}`)
        router.refresh()
        return
      }

      if (kind === 'event') {
        const result = await quickCreateEvent({ title, startDate })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create event')
          return
        }
        toast.success('Event created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/events/${result.data.id}`)
        router.refresh()
        return
      }

      if (kind === 'donation') {
        const amountCents = Math.round(Number(amount || '0') * 100)
        const result = await quickRecordDonation({
          donorName: name,
          donorEmail: email,
          amountCents,
          campaignId: campaignId || undefined,
        })
        if (!result.success) {
          toast.error(result.error ?? 'Failed to record donation')
          return
        }
        toast.success('Donation recorded')
        setOpen(false)
        resetForm()
        router.push(result.data?.campaignId ? `/dashboard/fundraising/${result.data.campaignId}` : '/dashboard/fundraising')
        router.refresh()
        return
      }

      if (kind === 'deal') {
        const result = await quickCreateDeal({
          title,
          contactEmail,
          valueCents: Math.max(0, Math.round(Number(value || '0') * 100)),
        })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create deal')
          return
        }
        toast.success('Deal created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/crm/deals/${result.data.id}`)
        router.refresh()
        return
      }

      if (kind === 'task') {
        const result = await quickCreateTask({ title, contactEmail: contactEmail || undefined })
        if (!result.success || !result.data?.id) {
          toast.error(result.error ?? 'Failed to create task')
          return
        }
        toast.success('Task created')
        setOpen(false)
        resetForm()
        router.push(`/dashboard/crm/tasks/${result.data.id}`)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as CreateKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(kind === 'contact' || kind === 'membership') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First name</Label>
                    <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last name</Label>
                    <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                {kind === 'contact' && (
                  <div className="space-y-1.5">
                    <Label>Phone (optional)</Label>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </div>
                )}
              </>
            )}

            {kind === 'company' && (
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
            )}

            {kind === 'event' && (
              <>
                <div className="space-y-1.5">
                  <Label>Event title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Start date and time</Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
              </>
            )}

            {kind === 'donation' && (
              <>
                <div className="space-y-1.5">
                  <Label>Donor name</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Donor email</Label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (USD)</Label>
                  <Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Campaign ID (optional)</Label>
                  <Input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} />
                </div>
              </>
            )}

            {kind === 'deal' && (
              <>
                <div className="space-y-1.5">
                  <Label>Deal title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact email</Label>
                  <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deal value (USD)</Label>
                  <Input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} />
                </div>
              </>
            )}

            {kind === 'task' && (
              <>
                <div className="space-y-1.5">
                  <Label>Task title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact email (optional)</Label>
                  <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={onSubmit}>
              {isSubmitting ? 'Creating...' : actionLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
