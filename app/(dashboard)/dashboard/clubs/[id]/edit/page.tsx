import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getClub } from '@/lib/actions/clubs'
import { ClubForm } from '../../_components/club-form'

export const metadata: Metadata = { title: 'Edit Club' }

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getClub(id)
  if (!result.success || !result.data) notFound()
  const club = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/clubs/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Club</h1>
      </div>
      <ClubForm
        initialData={{
          id: club.id,
          name: club.name,
          description: club.description ?? '',
          isPrivate: club.isPrivate,
          isActive: club.isActive,
        }}
      />
    </div>
  )
}
