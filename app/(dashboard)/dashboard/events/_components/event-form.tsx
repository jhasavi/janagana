'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createEvent, updateEvent } from '@/lib/actions/events'
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
import type { Event } from '@prisma/client'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  location: z.string().optional(),
  virtualLink: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  priceCents: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED']),
  format: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']),
  coverImageUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

type FormData = z.infer<typeof schema>

function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

interface EventFormProps {
  event?: Event | null
}

export function EventForm({ event }: EventFormProps) {
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
      title: event?.title ?? '',
      description: event?.description ?? '',
      startDate: toDatetimeLocal(event?.startDate) || toDatetimeLocal(new Date()),
      endDate: toDatetimeLocal(event?.endDate) || null,
      location: event?.location ?? '',
      virtualLink: event?.virtualLink ?? '',
      capacity: event?.capacity ?? null,
      priceCents: event?.priceCents ?? 0,
      status: event?.status ?? 'DRAFT',
      format: event?.format ?? 'IN_PERSON',
      coverImageUrl: event?.coverImageUrl ?? '',
      tags: event?.tags ?? [],
    },
  })

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = event
        ? await updateEvent(event.id, data)
        : await createEvent(data)

      if (result.success) {
        toast.success(event ? 'Event updated' : 'Event created')
        router.push(event ? `/dashboard/events/${event.id}` : '/dashboard/events')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {event ? 'Edit Event' : 'Create Event'}
          </h1>
        </div>
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save Event'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input id="title" {...register('title')} placeholder="e.g. Annual Gala 2026" />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe your event..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">
                  Start Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input id="endDate" type="datetime-local" {...register('endDate')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="e.g. Boston Convention Center"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="virtualLink">Virtual Link</Label>
                <Input
                  id="virtualLink"
                  type="url"
                  {...register('virtualLink')}
                  placeholder="https://zoom.us/..."
                />
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
                  onValueChange={(v) => setValue('status', v as FormData['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select
                  defaultValue={watch('format')}
                  onValueChange={(v) => setValue('format', v as FormData['format'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PERSON">In Person</SelectItem>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity">Max Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  {...register('capacity')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priceCents">Ticket Price (cents)</Label>
                <Input
                  id="priceCents"
                  type="number"
                  min="0"
                  placeholder="0 = free"
                  {...register('priceCents')}
                />
                <p className="text-xs text-muted-foreground">Enter 0 for free events</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="coverImageUrl">Image URL</Label>
                <Input
                  id="coverImageUrl"
                  type="url"
                  {...register('coverImageUrl')}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
