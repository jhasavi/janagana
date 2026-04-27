import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Building2, MapPin, Users, BadgeCheck, BadgeX } from 'lucide-react'
import { getChapters } from '@/lib/actions/chapters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

async function ChaptersList() {
  const result = await getChapters()
  const chapters = result.data ?? []

  if (chapters.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No chapters yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create chapters to organize your members by region or group.
            </p>
          </div>
          <Link href="/dashboard/chapters/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {chapters.map((chapter) => (
        <Link key={chapter.id} href={`/dashboard/chapters/${chapter.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{chapter.name}</CardTitle>
                {chapter.isActive ? (
                  <Badge variant="default" className="gap-1 shrink-0">
                    <BadgeCheck className="h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <BadgeX className="h-3 w-3" /> Inactive
                  </Badge>
                )}
              </div>
              {(chapter.city || chapter.state) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {[chapter.city, chapter.state].filter(Boolean).join(', ')}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {chapter.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {chapter.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {chapter._count.memberships} member{chapter._count.memberships !== 1 ? 's' : ''}
              </div>
              <p className="text-xs text-muted-foreground mt-1">/{chapter.slug}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function ChaptersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chapters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize members by region, city, or group
          </p>
        </div>
        <Link href="/dashboard/chapters/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Chapter
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-40 animate-pulse bg-muted" />
            ))}
          </div>
        }
      >
        <ChaptersList />
      </Suspense>
    </div>
  )
}
