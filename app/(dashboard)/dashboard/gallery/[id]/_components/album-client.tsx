'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Trash2, Globe, Lock, X } from 'lucide-react'
import { uploadPhoto, deletePhoto, updatePhotoAlbum, deletePhotoAlbum } from '@/lib/actions/gallery'
import { Button } from '@/components/ui/button'
import type { Photo, PhotoAlbum } from '@prisma/client'

interface Props {
  album: PhotoAlbum & { photos: Photo[] }
}

export function AlbumClient({ album: initialAlbum }: Props) {
  const [album, setAlbum] = useState(initialAlbum)
  const [photos, setPhotos] = useState(initialAlbum.photos)
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleUpload = () => {
    const files = fileRef.current?.files
    if (!files || files.length === 0) return

    startTransition(async () => {
      let uploaded = 0
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.set('albumId', album.id)
        fd.set('file', file)

        const result = await uploadPhoto(fd)
        if (result.success && result.data) {
          setPhotos((prev) => [...prev, result.data as Photo])
          uploaded++
        }
      }
      if (uploaded > 0) toast.success(`${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded`)
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  const handleDelete = (photoId: string) => {
    startTransition(async () => {
      const result = await deletePhoto(photoId)
      if (result.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
        if (selected?.id === photoId) setSelected(null)
        toast.success('Photo deleted')
      } else {
        toast.error(result.error ?? 'Delete failed')
      }
    })
  }

  const togglePublish = () => {
    startTransition(async () => {
      const result = await updatePhotoAlbum(album.id, {
        title:       album.title,
        description: album.description ?? undefined,
        isPublished: !album.isPublished,
        sortOrder:   album.sortOrder,
      })
      if (result.success && result.data) {
        setAlbum(result.data as typeof album)
        toast.success(result.data.isPublished ? 'Album published' : 'Album unpublished')
      } else {
        toast.error(result.error ?? 'Failed')
      }
    })
  }

  const handleDeleteAlbum = () => {
    if (!confirm('Delete this album and all its photos permanently?')) return
    startTransition(async () => {
      const result = await deletePhotoAlbum(album.id)
      if (result.success) {
        toast.success('Album deleted')
        router.push('/dashboard/gallery')
      } else {
        toast.error(result.error ?? 'Delete failed')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
        >
          <Upload className="h-3.5 w-3.5" /> Upload Photos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button size="sm" variant="outline" onClick={togglePublish} disabled={isPending}>
          {album.isPublished ? (
            <><Lock className="h-3.5 w-3.5" /> Unpublish</>
          ) : (
            <><Globe className="h-3.5 w-3.5" /> Publish</>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive ml-auto"
          onClick={handleDeleteAlbum}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Album
        </Button>
      </div>

      {photos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">Click to upload photos</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF — max 10 MB each</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
              onClick={() => setSelected(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.fileUrl}
                alt={photo.title ?? ''}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <button
                className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleDelete(photo.id) }}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.fileUrl}
              alt={selected.title ?? ''}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            {selected.caption && (
              <p className="text-center text-white mt-3 text-sm">{selected.caption}</p>
            )}
            <button
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2"
              onClick={() => setSelected(null)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
