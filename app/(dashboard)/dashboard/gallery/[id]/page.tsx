import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPhotoAlbum } from '@/lib/actions/gallery'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlbumClient } from './_components/album-client'

export const metadata: Metadata = { title: 'Album' }

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getPhotoAlbum(id)
  if (!result.success || !result.data) notFound()
  const album = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/gallery"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{album.title}</h1>
            <Badge variant={album.isPublished ? 'success' : 'secondary'}>
              {album.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          {album.description && (
            <p className="text-muted-foreground text-sm mt-0.5">{album.description}</p>
          )}
        </div>
      </div>
      <AlbumClient album={album} />
    </div>
  )
}
