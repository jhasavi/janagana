'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateTenantSettings } from '@/lib/actions/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const settingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(40, 'Slug must be 40 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  timezone: z.string().min(1),
  donationReceiptFooter: z.string().optional().nullable(),
  donationReceiptDisclaimer: z.string().optional().nullable(),
})

type SettingsData = z.infer<typeof settingsSchema>

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

interface Props {
  initialData: {
    name: string
    primaryColor: string
    timezone: string
    slug: string
    donationReceiptFooter?: string | null
    donationReceiptDisclaimer?: string | null
  } | null | undefined
}

export function SettingsForm({ initialData }: Props) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      primaryColor: initialData?.primaryColor ?? '#e11d48',
      timezone: initialData?.timezone ?? 'America/New_York',
      donationReceiptFooter: initialData?.donationReceiptFooter ?? '',
      donationReceiptDisclaimer: initialData?.donationReceiptDisclaimer ?? '',
    },
  })

  const timezone = watch('timezone')

  function onSubmit(values: SettingsData) {
    startTransition(async () => {
      const result = await updateTenantSettings(values)
      if (result.success) {
        toast.success('Settings saved')
      } else {
        toast.error(result.error ?? 'Failed to save settings')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register('slug')} className="font-mono text-sm" />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The portal path for your organization. Example: <span className="font-mono">/portal/your-organization-slug</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={(v) => setValue('timezone', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timezone && (
              <p className="text-xs text-destructive">{errors.timezone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Brand color</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="primaryColor"
                {...register('primaryColor')}
                placeholder="#e11d48"
                className="font-mono"
              />
              <input
                type="color"
                value={watch('primaryColor')}
                onChange={(e) => setValue('primaryColor', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border p-0.5"
              />
            </div>
            {errors.primaryColor && (
              <p className="text-xs text-destructive">{errors.primaryColor.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donationReceiptFooter">Donation receipt footer</Label>
            <Textarea
              id="donationReceiptFooter"
              {...register('donationReceiptFooter')}
              placeholder="Thank you for your support."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donationReceiptDisclaimer">Receipt disclaimer</Label>
            <Textarea
              id="donationReceiptDisclaimer"
              {...register('donationReceiptDisclaimer')}
              placeholder="This gift may be tax-deductible."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
