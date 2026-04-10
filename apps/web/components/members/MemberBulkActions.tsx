'use client';

import * as React from 'react';
import { Trash2, Mail, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@orgflow/types';

interface MemberBulkActionsProps {
  selectedCount: number;
  onSendEmail: () => void;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
  className?: string;
}

export function MemberBulkActions({
  selectedCount,
  onSendEmail,
  onChangeStatus,
  onDelete,
  className,
}: MemberBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-2xl',
        className,
      )}
    >
      <span className="text-sm font-semibold text-foreground">
        {selectedCount} selected
      </span>

      <Separator orientation="vertical" className="h-5" />

      <PermissionGate permission={PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS}>
        <Button variant="ghost" size="sm" onClick={onSendEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </Button>
      </PermissionGate>

      <PermissionGate permission={PERMISSIONS.MEMBERS.EDIT}>
        <Select onValueChange={onChangeStatus}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue placeholder="Change Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Set Active</SelectItem>
            <SelectItem value="INACTIVE">Set Inactive</SelectItem>
            <SelectItem value="PENDING">Set Pending</SelectItem>
            <SelectItem value="BANNED">Set Banned</SelectItem>
          </SelectContent>
        </Select>
      </PermissionGate>

      <PermissionGate permission={PERMISSIONS.MEMBERS.DELETE}>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </PermissionGate>
    </div>
  );
}
