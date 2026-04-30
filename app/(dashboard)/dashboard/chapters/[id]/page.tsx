import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getChapter } from '@/lib/actions/chapters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChapterMembersClient } from './_components/chapter-members-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChapterDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getChapter(id)
  if (!result.success || !result.data) notFound()
  const chapter = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/chapters">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{chapter.name}</h1>
            <Badge variant={chapter.isActive ? 'default' : 'secondary'}>
              {chapter.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {(chapter.city || chapter.state) && (
            <p className="text-sm text-muted-foreground">
              {[chapter.city, chapter.state, chapter.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <Link href={`/dashboard/chapters/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {chapter.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{chapter.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members ({chapter._count.chapterMemberships})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChapterMembersClient
            chapterId={chapter.id}
            memberships={chapter.chapterMemberships}
          />
        </CardContent>
      </Card>
    </div>
  )
}
