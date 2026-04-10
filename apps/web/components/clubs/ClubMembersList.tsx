'use client';

import * as React from 'react';
import { useState } from 'react';
import { MoreHorizontal, UserMinus, ShieldCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { ClubMembershipItem, ClubRoleType } from '@/lib/types/club';

const ROLE_LABELS: Record<ClubRoleType, string> = {
  LEADER: 'Leader',
  CO_LEADER: 'Co-Leader',
  MEMBER: 'Member',
};

const ROLE_BADGE_CLASSES: Record<ClubRoleType, string> = {
  LEADER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CO_LEADER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  MEMBER: '',
};

interface ClubMembersListProps {
  members: ClubMembershipItem[];
  isLeaderOrAdmin?: boolean;
  currentMemberId?: string;
  onUpdateRole?: (memberId: string, role: ClubRoleType) => void;
  onRemove?: (memberId: string) => void;
  onInvite?: (email: string) => Promise<void>;
}

export function ClubMembersList({
  members,
  isLeaderOrAdmin,
  currentMemberId,
  onUpdateRole,
  onRemove,
  onInvite,
}: ClubMembersListProps) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const confirmTarget = members.find((m) => m.member.id === confirmRemoveId);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !onInvite) return;
    setInviting(true);
    try {
      await onInvite(inviteEmail.trim());
      setInviteEmail('');
      toast.success('Invitation sent');
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite row */}
      {isLeaderOrAdmin && onInvite && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Invite by email…"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleInvite(); }}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => void handleInvite()}
            disabled={!inviteEmail.trim() || inviting}
          >
            {inviting ? 'Inviting…' : 'Invite'}
          </Button>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-lg border divide-y">
        {members.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        )}
        {members.map((item) => {
          const m = item.member;
          const isMe = m.id === currentMemberId;
          const isSelf = isMe;
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {(m.firstName[0] ?? '') + (m.lastName[0] ?? '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.firstName} {m.lastName}
                  {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
                {m.email && (
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ROLE_BADGE_CLASSES[item.role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {ROLE_LABELS[item.role]}
                </span>
                {isLeaderOrAdmin && !isSelf && item.role !== 'LEADER' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onUpdateRole && (
                        <>
                          {item.role !== 'CO_LEADER' && (
                            <DropdownMenuItem onClick={() => onUpdateRole(m.id, 'CO_LEADER')}>
                              <ShieldCheck className="h-4 w-4 mr-2" /> Make Co-Leader
                            </DropdownMenuItem>
                          )}
                          {item.role !== 'MEMBER' && (
                            <DropdownMenuItem onClick={() => onUpdateRole(m.id, 'MEMBER')}>
                              <UserCheck className="h-4 w-4 mr-2" /> Set as Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {onRemove && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmRemoveId(m.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm remove dialog */}
      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmRemoveId)}
          onOpenChange={(v: boolean) => { if (!v) setConfirmRemoveId(null); }}
          title="Remove member"
          description={`Remove ${confirmTarget.member.firstName} ${confirmTarget.member.lastName} from this club?`}
          destructive
          onConfirm={() => {
            onRemove?.(confirmRemoveId!);
            setConfirmRemoveId(null);
          }}
        />
      )}
    </div>
  );
}
