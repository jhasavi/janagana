'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createOpportunity, updateOpportunity } from '@/lib/actions/volunteers'
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
import type { VolunteerOpportunity } from '@prisma/client'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  location: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  hoursEstimate: z.coerce.number().positive().optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELED', 'COMPLETED']),
  tags: z.array(z.string()).default([]),
})

type FormData = z.infer<typeof schema>

function toDateLocal(date: Date | null | undefined) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

interface VolunteerFormProps {
  opportunity?: VolunteerOpportunity | null
}

export function VolunteerForm({ opportunity }: VolunteerFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: opportunity?.title ?? '',
      description: opportunity?.description ?? '',
      date: toDateLocal(opportunity?.date),
      endDate: toDateLocal(opportunity?.endDate),
      location: opportunity?.location ?? '',
      capacity: opportunity?.capacity ?? null,
      hoursEstimate: opportunity?.hoursEstimate ?? null,
      status: opportunity?.status ?? 'OPEN',
      tags: opportunity?.tags ?? [],
    },
  })

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = opportunity
        ? await updateOpportunity(opportunity.id, data)
        : await createOpportunity(data)

      if (result.success) {
        toast.success(opportunity ? 'Opportunity updated' : 'Opportunity created')
        router.push('/dashboard/volunteers')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/volunteers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {opportunity ? 'Edit Opportunity' : 'New Opportunity'}
          </h1>
        </div>
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g. Community Garden Cleanup"
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the volunteer opportunity..."
                  rows={5}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register('date')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" {...register('endDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="e.g. Central Park"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hoursEstimate">Estimated Hours</Label>
                  <Input
                    id="hoursEstimate"
                    type="number"
                    min="0.5"
                    step="0.5"
                    {...register('hoursEstimate')}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue={watch('status')}
                  onValueChange={(v) =>
                    setValue('status', v as FormData['status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity">Max Volunteers</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  {...register('capacity')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
