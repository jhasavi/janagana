'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createChapter, updateChapter } from '@/lib/actions/chapters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import type { Chapter } from '@prisma/client'

interface Props {
  chapter?: Chapter
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export function ChapterFormClient({ chapter }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(chapter?.name ?? '')
  const [slug, setSlug] = useState(chapter?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(!!chapter)
  const [description, setDescription] = useState(chapter?.description ?? '')
  const [city, setCity] = useState(chapter?.city ?? '')
  const [state, setState] = useState(chapter?.state ?? '')
  const [country, setCountry] = useState(chapter?.country ?? 'US')
  const [isActive, setIsActive] = useState(chapter?.isActive ?? true)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = { name, slug, description: description || undefined, city: city || undefined, state: state || undefined, country, isActive }
      const result = chapter
        ? await updateChapter(chapter.id, payload)
        : await createChapter(payload)

      if (result.success) {
        toast.success(chapter ? 'Chapter updated' : 'Chapter created')
        router.push('/dashboard/chapters')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Chapter Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Atlanta Chapter"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                placeholder="atlanta-chapter"
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this chapter focus on?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Atlanta" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="GA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-muted-foreground">Inactive chapters are hidden from members</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : chapter ? 'Save Changes' : 'Create Chapter'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
