'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { ForumThread } from '@prisma/client'
import { createForumThread, updateForumThread } from '@/lib/actions/forum'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Content is required'),
  category: z.enum(['GENERAL', 'ANNOUNCEMENTS', 'QUESTIONS', 'INTRODUCTIONS', 'FEEDBACK', 'PROJECTS', 'OTHER']),
  isPinned: z.boolean(),
  isLocked: z.boolean(),
  tagsRaw: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ForumThreadForm({ thread }: { thread?: ForumThread | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: thread?.title ?? '',
      body: thread?.body ?? '',
      category: (thread?.category ?? 'GENERAL') as FormValues['category'],
      isPinned: thread?.isPinned ?? false,
      isLocked: thread?.isLocked ?? false,
      tagsRaw: thread?.tags?.join(', ') ?? '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const tags = values.tagsRaw ? values.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
      const payload = { ...values, tags }

      const result = thread
        ? await updateForumThread(thread.id, payload)
        : await createForumThread(payload)

      if (result.success) {
        toast.success(thread ? 'Thread updated' : 'Thread created')
        router.push(thread ? `/dashboard/forum/${thread.id}` : '/dashboard/forum')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Thread</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="What's on your mind?" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller name="category" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['GENERAL','ANNOUNCEMENTS','QUESTIONS','INTRODUCTIONS','FEEDBACK','PROJECTS','OTHER'].map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Content *</Label>
            <Textarea id="body" rows={8} placeholder="Share details, links, or context…" {...register('body')} />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagsRaw">Tags (comma-separated)</Label>
            <Input id="tagsRaw" placeholder="e.g. announcement, event, help" {...register('tagsRaw')} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded" {...register('isPinned')} />
              Pin this thread
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded" {...register('isLocked')} />
              Lock (no replies)
            </label>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {thread ? 'Save changes' : 'Post thread'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
