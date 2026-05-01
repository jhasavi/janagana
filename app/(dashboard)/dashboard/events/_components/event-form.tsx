'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Upload, Link2, X } from 'lucide-react'
import Link from 'next/link'
import { createEvent, updateEvent, uploadEventCoverImage } from '@/lib/actions/events'
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
  const [coverTab, setCoverTab] = useState<'url' | 'upload'>('url')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadEventCoverImage(fd)
      if (result.success && result.url) {
        setValue('coverImageUrl', result.url)
        toast.success('Image uploaded')
      } else {
        toast.error(result.error ?? 'Upload failed')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
            <CardContent className="space-y-3">
              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setCoverTab('url')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${coverTab === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setCoverTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${coverTab === 'upload' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              </div>

              {coverTab === 'url' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="coverImageUrl">Image URL</Label>
                  <Input
                    id="coverImageUrl"
                    type="url"
                    {...register('coverImageUrl')}
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Upload Image</Label>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 p-6 cursor-pointer hover:border-muted-foreground/60 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isUploading ? 'Uploading…' : 'Click to select an image'}
                    </span>
                    <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF · max 10 MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}

              {watch('coverImageUrl') && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={watch('coverImageUrl')}
                    alt="Cover preview"
                    className="w-full h-36 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('coverImageUrl', '')}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
