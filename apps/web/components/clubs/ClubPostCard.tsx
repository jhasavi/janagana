'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Pin, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ClubPost, ClubPostComment, ClubMemberSummary } from '@/lib/types/club';

interface ClubPostCardProps {
  post: ClubPost;
  author?: ClubMemberSummary;
  comments?: ClubPostComment[];
  commentsLoading?: boolean;
  canPin?: boolean;
  canDelete?: boolean;
  canComment?: boolean;
  onPin?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onAddComment?: (postId: string, content: string) => Promise<void>;
  onExpandComments?: (postId: string) => void;
}

function initials(m?: ClubMemberSummary | null) {
  if (!m) return '?';
  return `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
}

export function ClubPostCard({
  post,
  author,
  comments,
  commentsLoading,
  canPin,
  canDelete,
  canComment,
  onPin,
  onDelete,
  onAddComment,
  onExpandComments,
}: ClubPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && onExpandComments) onExpandComments(post.id);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !onAddComment) return;
    setSubmitting(true);
    try {
      await onAddComment(post.id, commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', post.isPinned && 'border-primary/30 bg-primary/5')}>
      {/* Post header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">{initials(author)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {author ? `${author.firstName} ${author.lastName}` : 'Unknown member'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(post.publishedAt ?? post.createdAt), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
          {post.isPinned && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              <Pin className="h-3 w-3 mr-1" /> Pinned
            </Badge>
          )}
        </div>

        {(canPin || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPin && (
                <DropdownMenuItem onClick={() => onPin?.(post.id)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {post.isPinned ? 'Unpin post' : 'Pin post'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  {canPin && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(post.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Post body */}
      <div className="space-y-1">
        {post.title && <h4 className="font-semibold text-base">{post.title}</h4>}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </div>

      {/* Comments toggle */}
      <div className="pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleToggleComments}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1" />
          {post._count.comments} comment{post._count.comments !== 1 ? 's' : ''}
          {showComments ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
        </Button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="space-y-3 border-t pt-3">
          {commentsLoading ? (
            <p className="text-xs text-muted-foreground">Loading comments…</p>
          ) : (comments ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : (
            (comments ?? []).map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-xs">{initials(c.member)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 rounded-lg bg-muted p-2.5 text-sm">
                  <p className="font-medium text-xs mb-0.5">
                    {c.member.firstName} {c.member.lastName}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {format(new Date(c.createdAt), 'MMM d')}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))
          )}

          {canComment && (
            <div className="flex gap-2 pt-1">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="min-h-0 h-9 py-2 text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmitComment();
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!commentText.trim() || submitting}
                onClick={() => void handleSubmitComment()}
              >
                Post
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
