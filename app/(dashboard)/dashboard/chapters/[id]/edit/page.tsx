import { notFound } from 'next/navigation'
import { getChapter } from '@/lib/actions/chapters'
import { ChapterFormClient } from '../../new/_components/chapter-form-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChapterEditPage({ params }: Props) {
  const { id } = await params
  const result = await getChapter(id)
  if (!result.success || !result.data) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Chapter</h1>
        <p className="text-sm text-muted-foreground mt-1">{result.data.name}</p>
      </div>
      <ChapterFormClient chapter={result.data} />
    </div>
  )
}
