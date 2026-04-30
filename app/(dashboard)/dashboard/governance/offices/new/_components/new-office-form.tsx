'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createGovernanceOffice } from '@/lib/actions/governance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  sortOrder:   z.coerce.number().int().default(0),
})

type FormValues = z.infer<typeof schema>

export function NewOfficeForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', sortOrder: 0 },
  })

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await createGovernanceOffice(values)
      if (result.success) {
        toast.success('Office created')
        router.push('/dashboard/governance')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to create office')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Office Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. President, Secretary, Treasurer"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Responsibilities and duties for this office..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              placeholder="0"
              {...form.register('sortOrder')}
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first in listings.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Office'}
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
