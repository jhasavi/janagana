'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { ClubHeader } from '@/components/clubs/ClubHeader';
import { ClubPostCard } from '@/components/clubs/ClubPostCard';
import { CreatePostModal } from '@/components/clubs/CreatePostModal';

import {
  useClub,
  useMyClubMembership,
  useJoinClub,
  useLeaveClub,
  useClubMembers,
  useClubPosts,
  useCreatePost,
  usePinPost,
  useDeletePost,
  usePostComments,
  useAddComment,
  useClubEvents,
} from '@/hooks/useClubs';
import type { CreatePostInput } from '@/lib/validations/club';

const MEMBER_ID_KEY = 'portalMemberId';
function getMemberId() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(MEMBER_ID_KEY) ?? '';
}

export default function PortalClubDetailPage() {
  const params = useParams<{ id: string }>();
  const clubId = params.id;
  const memberId = getMemberId();

  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const { data: club, isLoading: clubLoading } = useClub(clubId);
  const { data: myMembership } = useMyClubMembership(clubId, memberId);
  const { data: membersData } = useClubMembers(clubId, { limit: 12 });
  const { data: postsData, isLoading: postsLoading } = useClubPosts(clubId);
  const { data: events } = useClubEvents(clubId);
  const { data: comments } = usePostComments(clubId, expandedPostId ?? '');

  const posts = postsData?.data ?? [];
  const members = membersData?.data ?? [];

  const joinClub = useJoinClub(clubId);
  const leaveClub = useLeaveClub(clubId);
  const createPost = useCreatePost(clubId, memberId);
  const pinPost = usePinPost(clubId, memberId);
  const deletePost = useDeletePost(clubId, memberId);
  const addComment = useAddComment(clubId, expandedPostId ?? '', memberId);

  const isLeader =
    myMembership?.role === 'LEADER' || myMembership?.role === 'CO_LEADER';

  const handleCreatePost = async (data: CreatePostInput) => {
    try {
      await createPost.mutateAsync(data);
      toast.success('Post published');
    } catch {
      toast.error('Failed to create post');
    }
  };

  if (clubLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Club not found.{' '}
        <Link href="/portal/clubs" className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/clubs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            All Clubs
          </Button>
        </Link>
      </div>

      <ClubHeader
        club={club}
        myMembership={myMembership ?? null}
        memberCount={club._count?.memberships ?? 0}
        postCount={club._count?.posts ?? 0}
        eventCount={club._count?.events ?? 0}
        onJoin={() => {
          if (!memberId) { toast.error('Member ID not found'); return; }
          joinClub.mutate(memberId, {
            onSuccess: () => toast.success(`Joined ${club.name}!`),
            onError: () => toast.error('Failed to join'),
          });
        }}
        onLeave={() => {
          if (!memberId) return;
          leaveClub.mutate(memberId, {
            onSuccess: () => toast.success('Left club'),
            onError: () => toast.error('Failed to leave'),
          });
        }}
        joinPending={joinClub.isPending}
        leavePending={leaveClub.isPending}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts feed */}
        <div className="lg:col-span-2 space-y-4">
          {myMembership && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCreatePostOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Post
              </Button>
            </div>
          )}

          {postsLoading ? (
            <Skeleton className="h-48" />
          ) : posts.length === 0 ? (
            <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">
              No posts yet.{myMembership ? ' Be the first to post!' : ''}
            </div>
          ) : (
            posts.map((post) => (
              <ClubPostCard
                key={post.id}
                post={post}
                comments={expandedPostId === post.id ? (comments as any[] | undefined) ?? [] : undefined}
                canPin={isLeader}
                canDelete={isLeader}
                canComment={Boolean(myMembership)}
                onPin={(id) => { pinPost.mutate(id); }}
                onDelete={(id) => { deletePost.mutate(id); toast.success('Post deleted'); }}
                onExpandComments={(id) => setExpandedPostId(id === expandedPostId ? null : id)}
                onAddComment={async (_, content) => {
                  await addComment.mutateAsync({ content });
                }}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Members ({club._count?.memberships ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {members.slice(0, 12).map((item) => (
                  <Avatar key={item.id} className="h-8 w-8" title={`${item.member.firstName} ${item.member.lastName}`}>
                    <AvatarFallback className="text-xs">
                      {(item.member.firstName[0] ?? '') + (item.member.lastName[0] ?? '')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(club._count?.memberships ?? 0) > 12 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{(club._count?.memberships ?? 0) - 12} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming events */}
          {events && events.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Club Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.slice(0, 5).map((e) => (
                  <div key={e.id} className="text-sm">
                    <p className="font-medium truncate">{e.event?.title ?? e.eventId}</p>
                    {e.event?.startsAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.event.startsAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreatePostModal
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onSubmit={handleCreatePost}
        isLeader={isLeader}
      />
    </div>
  );
}
