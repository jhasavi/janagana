import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewCommitteeForm } from './_components/new-committee-form'

export default function NewCommitteePage() {
  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/governance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Committee</h1>
          <p className="text-muted-foreground text-sm">
            Create a standing or ad hoc committee for your organization.
          </p>
        </div>
      </div>

      <NewCommitteeForm />
    </div>
  )
}
