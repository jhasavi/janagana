import type { Metadata } from 'next'
import { ForumThreadForm } from '../_components/forum-thread-form'

export const metadata: Metadata = { title: 'New Thread' }

export default function NewThreadPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Start a Discussion</h1>
        <p className="text-muted-foreground text-sm mt-1">Post a new thread for your members to engage with.</p>
      </div>
      <ForumThreadForm />
    </div>
  )
}
