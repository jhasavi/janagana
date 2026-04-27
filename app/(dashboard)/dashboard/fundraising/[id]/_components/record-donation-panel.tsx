'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DollarSign } from 'lucide-react'
import { recordDonation } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  donorName:  z.string().min(1, 'Required'),
  donorEmail: z.string().email('Invalid email'),
  amount:     z.number({ invalid_type_error: 'Enter an amount' }).positive(),
  message:    z.string().optional(),
  isAnonymous: z.boolean().default(false),
})
type Fields = z.infer<typeof schema>

export function RecordDonationPanel({ campaignId }: { campaignId: string }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: Fields) => {
    setSaving(true)
    const result = await recordDonation({
      campaignId,
      donorName: values.donorName,
      donorEmail: values.donorEmail,
      amountCents: Math.round(values.amount * 100),
      message: values.message,
      isAnonymous: values.isAnonymous,
    })
    setSaving(false)
    if (result.success) {
      toast.success('Donation recorded')
      reset()
    } else {
      toast.error(result.error ?? 'Failed to record donation')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" /> Record Donation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="donorName">Donor Name</Label>
            <Input id="donorName" {...register('donorName')} />
            {errors.donorName && <p className="text-xs text-destructive mt-1">{errors.donorName.message}</p>}
          </div>
          <div>
            <Label htmlFor="donorEmail">Donor Email</Label>
            <Input id="donorEmail" type="email" {...register('donorEmail')} />
            {errors.donorEmail && <p className="text-xs text-destructive mt-1">{errors.donorEmail.message}</p>}
          </div>
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" rows={3} {...register('message')} />
          </div>
          <div className="flex items-center gap-2">
            <input id="isAnonymous" type="checkbox" {...register('isAnonymous')} className="h-4 w-4" />
            <Label htmlFor="isAnonymous">Anonymous</Label>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Record Donation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
