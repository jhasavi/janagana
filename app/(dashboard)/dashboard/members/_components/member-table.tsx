'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMember } from '@/lib/actions/members'
import { formatDate, initials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Member, MembershipTier } from '@prisma/client'

type MemberWithTier = Member & { tier: MembershipTier | null }

const statusConfig = {
  ACTIVE: { label: 'Active', variant: 'success' as const },
  INACTIVE: { label: 'Inactive', variant: 'secondary' as const },
  PENDING: { label: 'Pending', variant: 'warning' as const },
  BANNED: { label: 'Banned', variant: 'destructive' as const },
}

interface MemberTableProps {
  members: MemberWithTier[]
}

export function MemberTable({ members }: MemberTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const handleDelete = () => {
    if (!deleteId) return
    startDelete(async () => {
      const result = await deleteMember(deleteId)
      if (result.success) {
        toast.success('Member deleted')
        setDeleteId(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h3 className="font-semibold text-lg mb-1">No members yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Get started by adding your first member.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/members/new">Add Member</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Renews</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const status = statusConfig[member.status]
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                          {initials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/dashboard/members/${member.id}`}
                          className="font-medium hover:underline text-sm"
                        >
                          {member.firstName} {member.lastName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {member.tier ? (
                      <Badge variant="outline" className="text-xs">
                        {member.tier.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.renewsAt ? formatDate(member.renewsAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/members/${member.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/members/${member.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this member? This action cannot be undone. All
            their event registrations and volunteer signups will also be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
