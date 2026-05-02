'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type EventStats = {
  total: number
  upcoming: number
  past: number
  published: number
  draft: number
  canceled: number
  completed: number
}

interface EventFiltersProps {
  stats: EventStats | null
}

export function EventFilters({ stats }: EventFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key === 'status' && value && value !== 'all') {
        params.delete('scope')
      }
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  const setQuickFilter = useCallback(
    (filter: 'all' | 'upcoming' | 'past' | 'draft' | 'canceled') => {
      const params = new URLSearchParams(searchParams.toString())

      if (filter === 'all') {
        params.delete('scope')
        params.delete('status')
      } else if (filter === 'upcoming' || filter === 'past') {
        params.set('scope', filter)
        params.delete('status')
      } else if (filter === 'draft') {
        params.set('status', 'DRAFT')
        params.delete('scope')
      } else if (filter === 'canceled') {
        params.set('status', 'CANCELED')
        params.delete('scope')
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  const currentScope = searchParams.get('scope')
  const currentStatus = searchParams.get('status')
  const activeQuickFilter =
    currentScope === 'upcoming' || currentScope === 'past'
      ? currentScope
      : currentStatus === 'DRAFT'
        ? 'draft'
        : currentStatus === 'CANCELED'
          ? 'canceled'
          : 'all'

  const hasFilters = !!searchParams.get('search') || !!searchParams.get('status') || !!searchParams.get('scope')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant={activeQuickFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('all')}>
          All
          <Badge variant="secondary" className="ml-2">{stats?.total ?? 0}</Badge>
        </Button>
        <Button variant={activeQuickFilter === 'upcoming' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('upcoming')}>
          Upcoming
          <Badge variant="secondary" className="ml-2">{stats?.upcoming ?? 0}</Badge>
        </Button>
        <Button variant={activeQuickFilter === 'past' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('past')}>
          Past
          <Badge variant="secondary" className="ml-2">{stats?.past ?? 0}</Badge>
        </Button>
        <Button variant={activeQuickFilter === 'draft' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('draft')}>
          Draft
          <Badge variant="secondary" className="ml-2">{stats?.draft ?? 0}</Badge>
        </Button>
        <Button variant={activeQuickFilter === 'canceled' ? 'default' : 'outline'} size="sm" onClick={() => setQuickFilter('canceled')}>
          Cancelled
          <Badge variant="secondary" className="ml-2">{stats?.canceled ?? 0}</Badge>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            defaultValue={searchParams.get('search') ?? ''}
            onChange={(e) => updateParams('search', e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={(v) => updateParams('status', v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
