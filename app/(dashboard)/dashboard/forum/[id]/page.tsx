import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pin, Lock, Pencil, Trash2, MessageSquare } from 'lucide-react'
import { getForumThread } from '@/lib/actions/forum'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ForumReplyForm } from './_components/forum-reply-form'
import { ForumThreadActions } from './_components/forum-thread-actions'
import { formatDistanceToNow, format } from 'date-fns'

export const metadata: Metadata = { title: 'Thread' }

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General', ANNOUNCEMENTS: 'Announcements', QUESTIONS: 'Q&A',
  INTRODUCTIONS: 'Introductions', FEEDBACK: 'Feedback', PROJECTS: 'Projects', OTHER: 'Other',
}

export default async function ForumThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getForumThread(id)
  if (!result.success || !result.data) notFound()

  const thread = result.data

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/forum">
            <ArrowLeft className="h-4 w-4" />
            Back to Forum
          </Link>
        </Button>
      </div>

      {/* Thread */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {thread.isPinned && <Pin className="h-4 w-4 text-blue-500" />}
                {thread.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                <h1 className="text-xl font-bold">{thread.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline">{CATEGORY_LABELS[thread.category] ?? thread.category}</Badge>
                {thread.author && <span>{thread.author.firstName} {thread.author.lastName}</span>}
                <span title={format(thread.createdAt, 'PPPp')}>
                  {formatDistanceToNow(thread.createdAt, { addSuffix: true })}
                </span>
                <span>{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
            <ForumThreadActions thread={{ id: thread.id, isPinned: thread.isPinned, isLocked: thread.isLocked }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{thread.body}</div>
        </CardContent>
      </Card>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {thread.replies.length} {thread.replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>
          {thread.replies.map((reply) => (
            <Card key={reply.id} className={reply.isAdminReply ? 'border-blue-200 bg-blue-50/20' : ''}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {reply.author ? (
                      <span className="font-medium">{reply.author.firstName} {reply.author.lastName}</span>
                    ) : (
                      <span className="font-medium">Admin</span>
                    )}
                    {reply.isAdminReply && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                    <span title={format(reply.createdAt, 'PPPp')}>
                      {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap">{reply.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!thread.isLocked && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Add a reply
            </h2>
            <ForumReplyForm threadId={thread.id} />
          </div>
        </>
      )}

      {thread.isLocked && (
        <Card className="border-muted">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            This thread is locked. No new replies can be added.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
