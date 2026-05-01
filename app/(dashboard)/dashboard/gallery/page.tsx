import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Image, Lock, Globe } from 'lucide-react'
import { getPhotoAlbums } from '@/lib/actions/gallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { GalleryActions } from './_components/gallery-actions'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Photo Gallery' }

export default async function GalleryPage() {
  const result = await getPhotoAlbums()
  const albums = result.data ?? []

  const published = albums.filter((a) => a.isPublished).length
  const totalPhotos = albums.reduce((s, a) => s + a._count.photos, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Photo Gallery</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Organize photos into albums. Publish albums to make them visible on your member portal.
            </p>
          </div>
          <HelpButton
            title="Photo Gallery"
            content="Create photo albums to share with your members. Upload photos, organize them into albums, and publish them to the member portal."
            link="/dashboard/help/features/photo-gallery"
          />
        </div>
        <GalleryActions />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Albums</p>
            <p className="text-3xl font-bold mt-1">{albums.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Published</p>
            <p className="text-3xl font-bold mt-1">{published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Total Photos</p>
            <p className="text-3xl font-bold mt-1">{totalPhotos}</p>
          </CardContent>
        </Card>
      </div>

      {albums.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Image className="h-12 w-12 text-muted-foreground/30" alt="No albums icon" />
            <p className="text-muted-foreground">No albums yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create an album and upload photos to share with your members.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <Card key={album.id} className="hover:shadow-md transition-shadow overflow-hidden">
              {album.coverUrl ? (
                <div className="relative h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 bg-muted flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground/30" alt="No cover image" />
                </div>
              )}
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base line-clamp-1">{album.title}</CardTitle>
                <Badge variant={album.isPublished ? 'success' : 'secondary'}>
                  {album.isPublished ? (
                    <><Globe className="h-3 w-3 mr-1" />Public</>
                  ) : (
                    <><Lock className="h-3 w-3 mr-1" />Draft</>
                  )}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{album._count.photos} photo{album._count.photos !== 1 ? 's' : ''}</span>
                  <span>{formatDate(album.createdAt)}</span>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/dashboard/gallery/${album.id}`}>Open Album</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
