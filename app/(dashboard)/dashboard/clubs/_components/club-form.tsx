'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClub, updateClub } from '@/lib/actions/clubs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ClubSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  isActive: z.boolean().default(true),
})
type FormData = z.infer<typeof ClubSchema>

interface ClubFormProps {
  initialData?: Partial<FormData> & { id?: string }
}

export function ClubForm({ initialData }: ClubFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(ClubSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      isPrivate: initialData?.isPrivate ?? false,
      isActive: initialData?.isActive ?? true,
    },
  })

  async function onSubmit(data: FormData) {
    const result = isEdit
      ? await updateClub(initialData!.id!, data)
      : await createClub(data)

    if (result.success) {
      toast.success(isEdit ? 'Club updated' : 'Club created')
      router.push(isEdit ? `/dashboard/clubs/${initialData!.id}` : '/dashboard/clubs')
    } else {
      toast.error(result.error ?? 'Something went wrong')
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Club' : 'Create Club'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Club Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Photography Club" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="What is this club about?"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isPrivate')} className="rounded" />
              Private (invite-only)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="rounded" />
              Active
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Club'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
