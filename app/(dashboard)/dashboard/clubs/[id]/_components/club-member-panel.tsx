'use client'

import { useState, useTransition } from 'react'
import { Users, UserPlus, UserMinus, Crown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { addClubMember, removeClubMember } from '@/lib/actions/clubs'
import { initials } from '@/lib/utils'

type ClubMember = {
  memberId: string
  role: string
  member: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null }
}
type AvailableMember = { id: string; firstName: string; lastName: string; email: string }

interface ClubMemberPanelProps {
  club: { id: string; memberships: ClubMember[] }
  availableMembers: AvailableMember[]
}

export function ClubMemberPanel({ club, availableMembers }: ClubMemberPanelProps) {
  const [memberships, setMemberships] = useState(club.memberships)
  const [addedPool, setAddedPool] = useState(availableMembers)
  const [selectedId, setSelectedId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await addClubMember(club.id, selectedId)
      if (res.success) {
        const member = addedPool.find((m) => m.id === selectedId)!
        setMemberships((prev) => [...prev, { memberId: selectedId, role: 'MEMBER', member: { ...member, avatarUrl: null } }])
        setAddedPool((prev) => prev.filter((m) => m.id !== selectedId))
        setSelectedId('')
        toast.success('Member added')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const res = await removeClubMember(club.id, memberId)
      if (res.success) {
        const removed = memberships.find((m) => m.memberId === memberId)
        if (removed) setAddedPool((prev) => [...prev, removed.member])
        setMemberships((prev) => prev.filter((m) => m.memberId !== memberId))
        toast.success('Member removed')
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  const roleConfig: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' }> = {
    OWNER:  { label: 'Owner', variant: 'warning' },
    ADMIN:  { label: 'Admin', variant: 'secondary' },
    MEMBER: { label: 'Member', variant: 'secondary' },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Members ({memberships.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member */}
        {addedPool.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Add member…" />
              </SelectTrigger>
              <SelectContent>
                {addedPool.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={!selectedId || isPending}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Members list */}
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => {
              const role = roleConfig[m.role] ?? roleConfig.MEMBER
              return (
                <div key={m.memberId} className="flex items-center gap-2 group">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.member.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initials(m.member.firstName, m.member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.member.firstName} {m.member.lastName}
                    </p>
                  </div>
                  <Badge variant={role.variant} className="text-xs">{role.label}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(m.memberId)}
                    disabled={isPending}
                    title="Remove from club"
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
