'use client'

import { useState, useTransition } from 'react'
import { MessageSquare, Trash2, Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClubPost, deleteClubPost } from '@/lib/actions/clubs'
import { initials } from '@/lib/utils'

type Post = {
  id: string
  content: string
  createdAt: Date
  member: { id: string; firstName: string; lastName: string }
}

type ClubWithPosts = {
  id: string
  memberships: { memberId: string; member: { id: string; firstName: string; lastName: string; email: string } }[]
  posts: Post[]
}

export function ClubPostPanel({ club }: { club: ClubWithPosts }) {
  const [posts, setPosts] = useState(club.posts)
  const [content, setContent] = useState('')
  const [authorId, setAuthorId] = useState(club.memberships[0]?.memberId ?? '')
  const [isPending, startTransition] = useTransition()

  function handlePost() {
    if (!content.trim() || !authorId) return
    startTransition(async () => {
      const res = await createClubPost(club.id, authorId, content.trim())
      if (res.success && res.data) {
        const author = club.memberships.find((m) => m.memberId === authorId)?.member
        setPosts((prev) => [
          {
            id: res.data!.id,
            content: res.data!.content,
            createdAt: res.data!.createdAt,
            member: author ?? { id: authorId, firstName: 'Admin', lastName: '' },
          },
          ...prev,
        ])
        setContent('')
        toast.success('Post created')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  function handleDelete(postId: string) {
    startTransition(async () => {
      const res = await deleteClubPost(postId)
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        toast.success('Post deleted')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Posts ({posts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New post form */}
        <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Post as…" />
            </SelectTrigger>
            <SelectContent>
              {club.memberships.map((m) => (
                <SelectItem key={m.memberId} value={m.memberId}>
                  {m.member.firstName} {m.member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Write a post…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handlePost}
            disabled={isPending || !content.trim() || !authorId}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Post
          </Button>
        </div>

        {/* Posts list */}
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No posts yet. Be the first to post!
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {initials(post.member.firstName, post.member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {post.member.firstName} {post.member.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(post.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
