'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Users, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';

import { ClubHeader } from '@/components/clubs/ClubHeader';
import { ClubMembersList } from '@/components/clubs/ClubMembersList';
import { ClubPostCard } from '@/components/clubs/ClubPostCard';
import { JoinRequestsPanel } from '@/components/clubs/JoinRequestsPanel';
import { ClubForm } from '@/components/clubs/ClubForm';

import {
  useClub,
  useClubDetailStats,
  useClubMembers,
  useUpdateClub,
  useDeleteClub,
  useUpdateMemberRole,
  useRemoveClubMember,
  useClubPosts,
  useDeletePost,
  usePinPost,
  useClubEvents,
  usePostComments,
  useAddComment,
  useLinkEvent,
  useTransferLeadership,
} from '@/hooks/useClubs';
import type { ClubRoleType } from '@/lib/types/club';
import type { UpdateClubInput } from '@/lib/validations/club';

export default function ClubDetailDashboardPage() {
  const params = useParams<{ id: string }>();
  const clubId = params.id;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const { data: club, isLoading: clubLoading } = useClub(clubId);
  const { data: stats } = useClubDetailStats(clubId);
  const { data: membersData, isLoading: membersLoading } = useClubMembers(clubId);
  const { data: postsData, isLoading: postsLoading } = useClubPosts(clubId);
  const { data: events } = useClubEvents(clubId);
  const { data: comments } = usePostComments(clubId, expandedPostId ?? '');

  const members = membersData?.data ?? [];
  const posts = postsData?.data ?? [];

  const updateClub = useUpdateClub(clubId, '');
  const deleteClub = useDeleteClub(clubId);
  const updateRole = useUpdateMemberRole(clubId, '');
  const removeMember = useRemoveClubMember(clubId, '');
  const deletePost = useDeletePost(clubId, '');
  const pinPost = usePinPost(clubId, '');
  const addComment = useAddComment(clubId, expandedPostId ?? '', '');
  const transferLeadership = useTransferLeadership(clubId, '');

  const handleUpdateClub = async (data: UpdateClubInput) => {
    try {
      await updateClub.mutateAsync(data as any);
      toast.success('Club updated');
    } catch {
      toast.error('Failed to update club');
    }
  };

  const handleDeleteClub = async () => {
    try {
      await deleteClub.mutateAsync();
      toast.success('Club deleted');
      window.location.href = '/dashboard/clubs';
    } catch {
      toast.error('Failed to delete club');
    }
  };

  const handleUpdateRole = (memberId: string, role: ClubRoleType) => {
    updateRole.mutate({ memberId, role });
    toast.success('Role updated');
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
        <Link href="/dashboard/clubs" className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clubs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Clubs
          </Button>
        </Link>
      </div>

      <ClubHeader
        club={club}
        memberCount={club._count?.memberships ?? 0}
        postCount={club._count?.posts ?? 0}
        eventCount={club._count?.events ?? 0}
        showAdminLinks
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({events?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatsCard title="Total Members" value={stats?.memberships ?? stats?.memberCount ?? 0} icon={Users} />
            <StatsCard title="Total Posts" value={stats?.posts ?? stats?.postCount ?? 0} icon={FileText} />
            <StatsCard title="Comments" value={stats?.comments ?? 0} icon={MessageSquare} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent posts */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Posts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {postsLoading ? <Skeleton className="h-20" /> : posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posts yet.</p>
                ) : (
                  posts.slice(0, 3).map((p) => (
                    <div key={p.id} className="text-sm border-l-2 border-primary/20 pl-3">
                      <p className="font-medium line-clamp-1">{p.title ?? p.body.slice(0, 60)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent members */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Members</CardTitle></CardHeader>
              <CardContent>
                {membersLoading ? <Skeleton className="h-20" /> : (
                  <JoinRequestsPanel members={members} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="pt-4">
          <ClubMembersList
            members={members}
            isLeaderOrAdmin
            onUpdateRole={handleUpdateRole}
            onRemove={(mId) => { removeMember.mutate(mId); toast.success('Member removed'); }}
          />
        </TabsContent>

        {/* Posts */}
        <TabsContent value="posts" className="space-y-4 pt-4">
          {postsLoading ? (
            <Skeleton className="h-48" />
          ) : posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <ClubPostCard
                key={post.id}
                post={post}
                comments={expandedPostId === post.id ? (comments as any[]) ?? [] : undefined}
                canPin
                canDelete
                onPin={(id) => { pinPost.mutate(id); }}
                onDelete={(id) => { deletePost.mutate(id); toast.success('Post deleted'); }}
                onExpandComments={(id) => setExpandedPostId(id)}
                onAddComment={async (_, content) => {
                  await addComment.mutateAsync({ content });
                }}
              />
            ))
          )}
        </TabsContent>

        {/* Events */}
        <TabsContent value="events" className="pt-4 space-y-3">
          {!events || events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No events linked to this club.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 rounded-lg border px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.event?.title ?? e.eventId}</p>
                  {e.event?.startsAt && (
                    <p className="text-xs text-muted-foreground">
                        {new Date(e.event.startsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="pt-4 space-y-8">
          <Card>
            <CardHeader><CardTitle className="text-sm">Edit Club</CardTitle></CardHeader>
            <CardContent>
              <ClubForm
                defaultValues={{
                  name: club.name,
                  description: club.description ?? undefined,
                  coverImageUrl: club.coverImageUrl ?? undefined,
                  isPublic: club.visibility === 'PUBLIC',
                  requiresApproval: club.visibility === 'INVITE_ONLY',
                }}
                onSubmit={handleUpdateClub}
                submitLabel="Save Changes"
                isSubmitting={updateClub.isPending}
              />
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-sm text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete this club</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove this club and all its data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete club"
        description={`Are you sure you want to permanently delete "${club.name}"? All posts, comments, and memberships will be removed.`}
        destructive
        onConfirm={() => void handleDeleteClub()}
      />
    </div>
  );
}
