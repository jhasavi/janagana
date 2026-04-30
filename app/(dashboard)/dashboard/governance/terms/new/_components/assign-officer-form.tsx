'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createOfficerTerm } from '@/lib/actions/governance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  officeId:  z.string().min(1, 'Office is required'),
  contactId: z.string().min(1, 'Person is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate:   z.string().optional(),
  notes:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  offices:  { id: string; title: string }[]
  contacts: { id: string; firstName: string; lastName: string; emails: string[]; email: string | null }[]
}

export function AssignOfficerForm({ offices, contacts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { officeId: '', contactId: '', startDate: '', endDate: '', notes: '' },
  })

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await createOfficerTerm({
        ...values,
        startDate: new Date(values.startDate),
        endDate:   values.endDate ? new Date(values.endDate) : undefined,
      })
      if (result.success) {
        toast.success('Officer assigned')
        router.push('/dashboard/governance')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to assign officer')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Office *</Label>
            {offices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No offices defined yet.{' '}
                <a href="/dashboard/governance/offices/new" className="underline">
                  Create one first.
                </a>
              </p>
            ) : (
              <Select onValueChange={(v) => form.setValue('officeId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an office…" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.officeId && (
              <p className="text-sm text-destructive">{form.formState.errors.officeId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Person *</Label>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contacts yet.{' '}
                <a href="/dashboard/crm/contacts/new" className="underline">
                  Add a person first.
                </a>
              </p>
            ) : (
              <Select onValueChange={(v) => form.setValue('contactId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a person…" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => {
                    const email = c.emails?.[0] ?? c.email ?? ''
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                        {email ? ` — ${email}` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.contactId && (
              <p className="text-sm text-destructive">{form.formState.errors.contactId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
              <p className="text-xs text-muted-foreground">Leave blank for open-ended term</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this appointment..."
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending || offices.length === 0 || contacts.length === 0}>
              {isPending ? 'Assigning…' : 'Assign Officer'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
