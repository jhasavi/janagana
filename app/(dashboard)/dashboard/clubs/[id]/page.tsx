import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, MessageSquare, Lock, Pencil, Trash2, UserMinus } from 'lucide-react'
import { getClub, deleteClubPost, removeClubMember } from '@/lib/actions/clubs'
import { getMembers } from '@/lib/actions/members'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { initials } from '@/lib/utils'
import { ClubMemberPanel } from './_components/club-member-panel'
import { ClubPostPanel } from './_components/club-post-panel'

export const metadata: Metadata = { title: 'Club Detail' }

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [clubResult, membersResult] = await Promise.all([
    getClub(id),
    getMembers({ status: 'ACTIVE' }),
  ])

  if (!clubResult.success || !clubResult.data) notFound()
  const club = clubResult.data
  const allMembers = membersResult.data ?? []

  const memberIds = new Set(club.memberships.map((m) => m.memberId))
  const nonMembers = allMembers.filter((m) => !memberIds.has(m.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/clubs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{club.name}</h1>
            {club.isPrivate && (
              <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Private</Badge>
            )}
            <Badge variant={club.isActive ? 'success' : 'secondary'}>
              {club.isActive ? 'Active' : 'Archived'}
            </Badge>
          </div>
          {club.description && (
            <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/clubs/${id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClubPostPanel club={club} />
        </div>
        <div>
          <ClubMemberPanel club={club} availableMembers={nonMembers} />
        </div>
      </div>
    </div>
  )
}
