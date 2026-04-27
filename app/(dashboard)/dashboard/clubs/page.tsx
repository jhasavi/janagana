import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Users, MessageSquare, Lock } from 'lucide-react'
import { getClubs } from '@/lib/actions/clubs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Clubs' }

export default async function ClubsPage() {
  const result = await getClubs()
  const clubs = result.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clubs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage community groups and clubs.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clubs/new">
            <Plus className="h-4 w-4" />
            New Club
          </Link>
        </Button>
      </div>

      {clubs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No clubs yet. Create your first community group.</p>
            <Button asChild>
              <Link href="/dashboard/clubs/new">Create Club</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/dashboard/clubs/${club.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{club.name}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      {club.isPrivate && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="h-2.5 w-2.5" /> Private
                        </Badge>
                      )}
                      <Badge variant={club.isActive ? 'success' : 'secondary'}>
                        {club.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                  </div>
                  {club.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {club._count.memberships} members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {club._count.posts} posts
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Created {formatDate(club.createdAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
