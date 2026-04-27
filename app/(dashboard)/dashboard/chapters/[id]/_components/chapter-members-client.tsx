'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, ShieldCheck } from 'lucide-react'
import {
  addChapterMember,
  removeChapterMember,
  updateChapterMemberRole,
} from '@/lib/actions/chapters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChapterMember, Member } from '@prisma/client'

type Membership = ChapterMember & { member: Member }

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  LEADER: 'Leader',
  ADMIN: 'Admin',
}

interface Props {
  chapterId: string
  memberships: Membership[]
}

export function ChapterMembersClient({ chapterId, memberships: initial }: Props) {
  const [memberships, setMemberships] = useState<Membership[]>(initial)
  const [emailInput, setEmailInput] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    if (!emailInput.trim()) return
    startTransition(async () => {
      // We pass email as the "memberId" placeholder — the action uses a lookup
      const result = await addChapterMember(chapterId, emailInput.trim())
      if (result.success) {
        toast.success('Member added')
        setEmailInput('')
        // Refresh by re-fetching happens via revalidatePath; user can see on next load
        // For immediate UI, prompt a page refresh
        window.location.reload()
      } else {
        toast.error(result.error ?? 'Failed to add member')
      }
    })
  }

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeChapterMember(id)
      if (result.success) {
        setMemberships((prev) => prev.filter((m) => m.id !== id))
        toast.success('Member removed')
      } else {
        toast.error(result.error ?? 'Failed to remove')
      }
    })
  }

  const handleRoleChange = (id: string, role: string) => {
    startTransition(async () => {
      const result = await updateChapterMemberRole(id, role as 'MEMBER' | 'LEADER' | 'ADMIN')
      if (result.success) {
        setMemberships((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, role: role as 'MEMBER' | 'LEADER' | 'ADMIN' } : m,
          ),
        )
        toast.success('Role updated')
      } else {
        toast.error(result.error ?? 'Failed to update role')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Add member row */}
      <div className="flex gap-2">
        <Input
          placeholder="Member email address…"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={isPending || !emailInput.trim()} size="sm">
          Add
        </Button>
      </div>

      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No members in this chapter yet.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {m.member.firstName} {m.member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{m.member.email}</p>
              </div>
              {m.role !== 'MEMBER' && (
                <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              )}
              <Select
                value={m.role}
                onValueChange={(val) => handleRoleChange(m.id, val)}
                disabled={isPending}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleRemove(m.id)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
