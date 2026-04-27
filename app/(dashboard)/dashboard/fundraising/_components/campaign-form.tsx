'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createCampaign, updateCampaign } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  goalCents: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).default('DRAFT'),
  endDate: z.string().optional().nullable(),
})
type FormData = z.infer<typeof Schema>

interface CampaignFormProps {
  initialData?: Partial<FormData> & { id?: string }
}

export function CampaignForm({ initialData }: CampaignFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      goalCents: initialData?.goalCents ?? 0,
      status: initialData?.status ?? 'DRAFT',
      endDate: initialData?.endDate ?? '',
    },
  })
  const status = watch('status')

  async function onSubmit(data: FormData) {
    const result = isEdit
      ? await updateCampaign(initialData!.id!, data)
      : await createCampaign(data)

    if (result.success) {
      toast.success(isEdit ? 'Campaign updated' : 'Campaign created')
      router.push(isEdit ? `/dashboard/fundraising/${initialData!.id}` : '/dashboard/fundraising')
    } else {
      toast.error(result.error ?? 'Something went wrong')
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Campaign Title *</Label>
            <Input id="title" {...register('title')} placeholder="e.g. Annual Fundraiser 2026" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="goalCents">Goal Amount ($)</Label>
              <Input
                id="goalCents"
                type="number"
                step="0.01"
                min="0"
                {...register('goalCents', { valueAsNumber: true, setValueAs: (v) => Math.round(Number(v) * 100) })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" {...register('endDate')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
