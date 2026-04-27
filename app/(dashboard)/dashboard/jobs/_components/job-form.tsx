'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { JobPosting } from '@prisma/client'
import { createJobPosting, updateJobPosting } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  company: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  description: z.string().min(1, 'Description is required'),
  applyUrl: z.string().optional(),
  applyEmail: z.string().optional(),
  salaryMin: z.coerce.number().int().min(0).optional().nullable(),
  salaryMax: z.coerce.number().int().min(0).optional().nullable(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VOLUNTEER', 'INTERNSHIP']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED']),
  isFeatured: z.boolean().default(false),
  expiresAt: z.string().optional(),
  tagsRaw: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  job?: JobPosting | null
}

export function JobForm({ job }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: job?.title ?? '',
      company: job?.company ?? '',
      location: job?.location ?? '',
      isRemote: job?.isRemote ?? false,
      description: job?.description ?? '',
      applyUrl: job?.applyUrl ?? '',
      applyEmail: job?.applyEmail ?? '',
      salaryMin: job?.salaryMin ?? null,
      salaryMax: job?.salaryMax ?? null,
      jobType: (job?.jobType ?? 'FULL_TIME') as FormValues['jobType'],
      status: (job?.status ?? 'DRAFT') as FormValues['status'],
      isFeatured: job?.isFeatured ?? false,
      expiresAt: job?.expiresAt ? new Date(job.expiresAt).toISOString().split('T')[0] : '',
      tagsRaw: job?.tags?.join(', ') ?? '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const tags = values.tagsRaw
        ? values.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
        : []
      const payload = { ...values, tags, tagsRaw: undefined }

      const result = job
        ? await updateJobPosting(job.id, payload)
        : await createJobPosting(payload)

      if (result.success) {
        toast.success(job ? 'Job updated' : 'Job posted')
        router.push('/dashboard/jobs')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Job details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title *</Label>
            <Input id="title" placeholder="e.g. Director of Communications" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company / Organization</Label>
              <Input id="company" placeholder="e.g. Riverside Nonprofit" {...register('company')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g. Boston, MA" {...register('location')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Job type</Label>
              <Controller
                name="jobType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full-time</SelectItem>
                      <SelectItem value="PART_TIME">Part-time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="VOLUNTEER">Volunteer</SelectItem>
                      <SelectItem value="INTERNSHIP">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="FILLED">Filled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded" {...register('isRemote')} />
              Remote position
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded" {...register('isFeatured')} />
              Featured listing
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={8}
            placeholder="Describe the role, responsibilities, requirements, and benefits..."
            {...register('description')}
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">How to apply</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="applyUrl">Application URL</Label>
              <Input id="applyUrl" type="url" placeholder="https://..." {...register('applyUrl')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="applyEmail">Or apply via email</Label>
              <Input id="applyEmail" type="email" placeholder="jobs@example.com" {...register('applyEmail')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Compensation & metadata</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salaryMin">Salary min (annual $)</Label>
              <Input id="salaryMin" type="number" placeholder="50000" {...register('salaryMin')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryMax">Salary max (annual $)</Label>
              <Input id="salaryMax" type="number" placeholder="80000" {...register('salaryMax')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Listing expires</Label>
              <Input id="expiresAt" type="date" {...register('expiresAt')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagsRaw">Tags (comma-separated)</Label>
              <Input id="tagsRaw" placeholder="e.g. nonprofit, marketing, remote" {...register('tagsRaw')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {job ? 'Save changes' : 'Post job'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
