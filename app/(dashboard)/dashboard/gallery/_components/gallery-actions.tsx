'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createPhotoAlbum } from '@/lib/actions/gallery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function GalleryActions() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const router = useRouter()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createPhotoAlbum({ title, description })
      if (result.success) {
        toast.success('Album created')
        setOpen(false)
        setTitle('')
        setDescription('')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to create album')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New Album</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Album</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="albumTitle">Title *</Label>
            <Input
              id="albumTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Gala 2025"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="albumDesc">Description (optional)</Label>
            <Textarea
              id="albumDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? 'Creating...' : 'Create Album'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
