'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Pin, Lock, Unlock, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { pinForumThread, lockForumThread, deleteForumThread } from '@/lib/actions/forum'
import { Button } from '@/components/ui/button'

interface Props {
  thread: { id: string; isPinned: boolean; isLocked: boolean }
}

export function ForumThreadActions({ thread }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handlePin() {
    startTransition(async () => {
      const result = await pinForumThread(thread.id, !thread.isPinned)
      if (result.success) toast.success(thread.isPinned ? 'Thread unpinned' : 'Thread pinned')
      else toast.error(result.error)
    })
  }

  function handleLock() {
    startTransition(async () => {
      const result = await lockForumThread(thread.id, !thread.isLocked)
      if (result.success) toast.success(thread.isLocked ? 'Thread unlocked' : 'Thread locked')
      else toast.error(result.error)
    })
  }

  function handleDelete() {
    if (!confirm('Delete this thread and all its replies?')) return
    startTransition(async () => {
      const result = await deleteForumThread(thread.id)
      if (result.success) {
        toast.success('Thread deleted')
        router.push('/dashboard/forum')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button variant="ghost" size="sm" onClick={handlePin} disabled={isPending} title={thread.isPinned ? 'Unpin' : 'Pin'} className="h-8 w-8 p-0">
        <Pin className={`h-4 w-4 ${thread.isPinned ? 'text-blue-500' : ''}`} />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleLock} disabled={isPending} title={thread.isLocked ? 'Unlock' : 'Lock'} className="h-8 w-8 p-0">
        {thread.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending} title="Delete thread" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
