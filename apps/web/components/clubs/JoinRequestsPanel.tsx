'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowRightLeft, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClubMembershipItem } from '@/lib/types/club';

interface JoinRequestsPanelProps {
  /** In the current schema there are no "pending" requests.
   *  This panel repurposes to show recently joined members and leader transfer. */
  members: ClubMembershipItem[];
  isLeader?: boolean;
  currentMemberId?: string;
  onTransferLeadership?: (newLeaderId: string) => void;
  transferPending?: boolean;
}

export function JoinRequestsPanel({
  members,
  isLeader,
  currentMemberId,
  onTransferLeadership,
  transferPending,
}: JoinRequestsPanelProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState('');

  const nonLeaders = members.filter(
    (m) => m.member.id !== currentMemberId && m.role !== 'LEADER',
  );

  const recent = [...members]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Recent members */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent Members</h3>
        </div>
        <div className="divide-y">
          {recent.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No members yet.</p>
          )}
          {recent.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">
                  {(item.member.firstName[0] ?? '') + (item.member.lastName[0] ?? '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.member.firstName} {item.member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {format(new Date(item.joinedAt), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                {item.role.toLowerCase().replace('_', '-')}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer leadership */}
      {isLeader && onTransferLeadership && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/10 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Leadership
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Transfer your leader role to another member. You will become a regular member.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300"
            onClick={() => setTransferDialogOpen(true)}
            disabled={nonLeaders.length === 0}
          >
            Transfer Leadership
          </Button>
        </div>
      )}

      {/* Transfer dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Leadership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the member who will become the new club leader.
            </p>
            <Select value={selectedNewLeader} onValueChange={setSelectedNewLeader}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member…" />
              </SelectTrigger>
              <SelectContent>
                {nonLeaders.map((m) => (
                  <SelectItem key={m.member.id} value={m.member.id}>
                    {m.member.firstName} {m.member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedNewLeader || transferPending}
                onClick={() => {
                  if (selectedNewLeader) {
                    onTransferLeadership!(selectedNewLeader);
                    setTransferDialogOpen(false);
                  }
                }}
              >
                {transferPending ? 'Transferring…' : 'Confirm Transfer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
