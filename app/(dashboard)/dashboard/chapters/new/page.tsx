import { ChapterFormClient } from './_components/chapter-form-client'

export default function NewChapterPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Chapter</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new regional chapter or sub-group
        </p>
      </div>
      <ChapterFormClient />
    </div>
  )
}
