'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useUser } from '@clerk/nextjs';
import {
  Loader2, UserPlus, Trash2, ChevronDown, Mail,
  UserCircle2, Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { getRoleFromPublicMetadata, hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@orgflow/types';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  useTeamMembers, useInviteTeamMember, useUpdateTeamMember, useRemoveTeamMember,
} from '@/hooks/useSettings';
import type { InviteTeamMemberInput, UserRoleType } from '@/lib/types/settings';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: { value: UserRoleType; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'READONLY', label: 'Read Only' },
];

const ROLE_BADGE: Record<UserRoleType, string> = {
  OWNER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  STAFF: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  READONLY: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

// ─── Invite form ──────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  fullName: z.string().min(2, 'At least 2 characters').max(80),
  role: z.enum(['OWNER', 'ADMIN', 'STAFF', 'READONLY']),
});

type InviteForm = z.infer<typeof inviteSchema>;

function InviteDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const { mutateAsync, isPending } = useInviteTeamMember();
  const {
    register, handleSubmit, reset, control,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'STAFF' },
  });

  const onSubmit = async (data: InviteForm) => {
    try {
      await mutateAsync(data as InviteTeamMemberInput);
      toast.success(`Invitation sent to ${data.email}`);
      reset();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              type="email"
              {...register('email')}
              placeholder="jane@yourorg.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Full Name</Label>
            <Input id="inv-name" {...register('fullName')} placeholder="Jane Smith" />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r.value !== 'OWNER').map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: members, isLoading } = useTeamMembers();
  const { mutateAsync: updateMember } = useUpdateTeamMember();
  const { mutateAsync: removeMember, isPending: removing } = useRemoveTeamMember();

  const { user } = useUser();
  const role = getRoleFromPublicMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined);
  const canManageUsers = hasPermission(role, PERMISSIONS.SETTINGS.MANAGE_TEAM);

  const [showInvite, setShowInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRoleChange = async (id: string, role: UserRoleType) => {
    try {
      await updateMember({ id, data: { role } });
      toast.success('Role updated');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingId) return;
    try {
      await removeMember(removingId);
      toast.success('Member removed');
      setRemovingId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has admin access to this organisation.
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.SETTINGS.MANAGE_TEAM}>
          <Button onClick={() => setShowInvite(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
        </PermissionGate>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            label: 'Owner',
            description: 'Full tenant access to settings, user management and tenant configuration.',
          },
          {
            label: 'Admin',
            description: 'Can manage members, events, clubs, volunteers and payments, but cannot change tenant settings or team roles.',
          },
          {
            label: 'Staff',
            description: 'Can view and update operational data, but cannot manage the team or tenant settings.',
          },
          {
            label: 'Read Only',
            description: 'View-only access to members, events, volunteers and clubs.',
          },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        {!members || members.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No team members yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Member</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Last Login</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.fullName} />}
                        <AvatarFallback>
                          {member.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-none">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.role === 'OWNER' ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE.OWNER}`}>
                        Owner
                      </span>
                    ) : canManageUsers ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[member.role]} cursor-pointer`}>
                            {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {ROLES.filter(r => r.value !== 'OWNER').map(r => (
                            <DropdownMenuItem
                              key={r.value}
                              onClick={() => handleRoleChange(member.id, r.value)}
                            >
                              {r.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[member.role]}`}>
                        {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {member.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.lastLoginAt
                      ? format(new Date(member.lastLoginAt), 'dd MMM yyyy')
                      : <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Never</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.role !== 'OWNER' && (
                      <PermissionGate permission={PERMISSIONS.SETTINGS.MANAGE_TEAM}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRemovingId(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PermissionGate>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} />

      <AlertDialog open={Boolean(removingId)} onOpenChange={open => !open && setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke their admin access. They will no longer be able to log into the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
