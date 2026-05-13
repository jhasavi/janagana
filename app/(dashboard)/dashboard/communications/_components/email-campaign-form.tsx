'use client'

import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createEmailCampaign, updateEmailCampaign } from '@/lib/actions/communications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const Schema = z.object({
  name:           z.string().min(1, 'Name required').max(200),
  subject:        z.string().min(1, 'Subject required').max(500),
  htmlBody:       z.string().min(1, 'Body required'),
  status:         z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED']).default('DRAFT'),
  targetTierIds:  z.array(z.string()).default([]),
  targetStatuses: z.array(z.string()).default([]),
})
type FormData = z.infer<typeof Schema>

const MEMBER_STATUSES = ['ACTIVE', 'PENDING', 'INACTIVE'] as const

interface Tier { id: string; name: string }

interface EmailCampaignFormProps {
  initialData?: Partial<FormData> & { id?: string }
  tiers?: Tier[]
}

export function EmailCampaignForm({ initialData, tiers = [] }: EmailCampaignFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name:           initialData?.name ?? '',
      subject:        initialData?.subject ?? '',
      htmlBody:       initialData?.htmlBody ?? '',
      status:         initialData?.status ?? 'DRAFT',
      targetTierIds:  (initialData?.targetTierIds as string[]) ?? [],
      targetStatuses: (initialData?.targetStatuses as string[]) ?? [],
    },
  })
  const status = watch('status')
  const targetTierIds = watch('targetTierIds')
  const targetStatuses = watch('targetStatuses')

  function toggleTier(tierId: string) {
    const current = targetTierIds ?? []
    setValue('targetTierIds', current.includes(tierId) ? current.filter((t) => t !== tierId) : [...current, tierId])
  }

  function toggleStatus(s: string) {
    const current = targetStatuses ?? []
    setValue('targetStatuses', current.includes(s) ? current.filter((x) => x !== s) : [...current, s])
  }

  async function onSubmit(data: FormData) {
    const result = isEdit
      ? await updateEmailCampaign(initialData!.id!, data)
      : await createEmailCampaign(data)

    if (result.success) {
      toast.success(isEdit ? 'Campaign updated' : 'Campaign created')
      router.push('/dashboard/communications')
    } else {
      toast.error((result as { error?: string }).error ?? 'Something went wrong')
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Monthly Newsletter — Jan 2026" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input id="subject" {...register('subject')} placeholder="Your membership update for January" />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="htmlBody">Email Body (HTML) *</Label>
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{{firstName}}'}</code>,{' '}
              <code className="bg-muted px-1 rounded">{'{{lastName}}'}</code>,{' '}
              <code className="bg-muted px-1 rounded">{'{{email}}'}</code> for personalization.
            </p>
            <Textarea
              id="htmlBody"
              {...register('htmlBody')}
              rows={12}
              className="font-mono text-sm"
              placeholder="<p>Dear {{firstName}},</p><p>Here is your update…</p>"
            />
            {errors.htmlBody && <p className="text-sm text-destructive">{errors.htmlBody.message}</p>}
          </div>

          {/* Audience targeting */}
          <div className="rounded-lg border p-4 space-y-4">
            <p className="text-sm font-medium">Audience Targeting</p>
            <p className="text-xs text-muted-foreground -mt-2">
              Leave all unchecked to send to all active members.
            </p>

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Filter by Membership Tier</Label>
                <div className="flex flex-wrap gap-2">
                  {tiers.map((tier) => {
                    const selected = targetTierIds?.includes(tier.id)
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => toggleTier(tier.id)}
                        className="focus:outline-none"
                      >
                        <Badge variant={selected ? 'default' : 'outline'} className="cursor-pointer">
                          {tier.name}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Filter by Member Status</Label>
              <div className="flex gap-4">
                {MEMBER_STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Checkbox
                      checked={targetStatuses?.includes(s)}
                      onCheckedChange={() => toggleStatus(s)}
                    />
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['DRAFT', 'SCHEDULED'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
