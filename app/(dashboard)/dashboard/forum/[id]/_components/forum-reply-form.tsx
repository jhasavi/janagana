'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { addForumReply } from '@/lib/actions/forum'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const schema = z.object({ body: z.string().min(1, 'Reply cannot be empty'), isAdminReply: z.boolean() })
type FormValues = z.infer<typeof schema>

export function ForumReplyForm({ threadId }: { threadId: string }) {
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: '', isAdminReply: false },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await addForumReply(threadId, values)
      if (result.success) {
        toast.success('Reply added')
        reset()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Textarea rows={4} placeholder="Write your reply…" {...register('body')} />
        {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
          <input type="checkbox" className="rounded" {...register('isAdminReply')} />
          Mark as admin reply
        </label>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Post reply
        </Button>
      </div>
    </form>
  )
}
