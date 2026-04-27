import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, MessageSquare, Pin, Lock } from 'lucide-react'
import { getForumThreads } from '@/lib/actions/forum'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Forum' }

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General',
  ANNOUNCEMENTS: 'Announcements',
  QUESTIONS: 'Q&A',
  INTRODUCTIONS: 'Introductions',
  FEEDBACK: 'Feedback',
  PROJECTS: 'Projects',
  OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  ANNOUNCEMENTS: 'bg-blue-100 text-blue-800',
  QUESTIONS: 'bg-purple-100 text-purple-800',
  INTRODUCTIONS: 'bg-green-100 text-green-800',
  FEEDBACK: 'bg-amber-100 text-amber-800',
  PROJECTS: 'bg-rose-100 text-rose-800',
}

export default async function ForumPage() {
  const result = await getForumThreads()
  const threads = result.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forum</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {threads.length} discussion{threads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/forum/new">
            <Plus className="h-4 w-4" />
            New Thread
          </Link>
        </Button>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No discussions yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Start conversations, share announcements, and engage your members.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/forum/new">
                <Plus className="h-4 w-4" />
                Start a discussion
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Card key={thread.id} className={thread.isPinned ? 'border-blue-200 bg-blue-50/30' : ''}>
              <CardContent className="flex items-start gap-4 py-4 px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.isPinned && <Pin className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    {thread.isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <Link
                      href={`/dashboard/forum/${thread.id}`}
                      className="font-semibold text-sm hover:underline"
                    >
                      {thread.title}
                    </Link>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        CATEGORY_COLORS[thread.category] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {CATEGORY_LABELS[thread.category] ?? thread.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {thread.author && (
                      <span>{thread.author.firstName} {thread.author.lastName}</span>
                    )}
                    <span>{formatDistanceToNow(thread.createdAt, { addSuffix: true })}</span>
                    <span>{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
                    {thread.lastReplyAt && (
                      <span>Last reply {formatDistanceToNow(thread.lastReplyAt, { addSuffix: true })}</span>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/forum/${thread.id}`}>View</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
