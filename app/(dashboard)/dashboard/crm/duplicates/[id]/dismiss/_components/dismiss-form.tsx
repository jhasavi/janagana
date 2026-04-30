'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { dismissDuplicate } from '@/lib/actions/duplicates'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Contact {
  id: string
  firstName: string
  lastName: string
  emails: string[]
  email: string | null
}

interface Suggestion {
  id: string
  contactA: Contact
  contactB: Contact
  confidenceScore: number
  matchReason: string | null
}

export function DismissForm({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissDuplicate(suggestion.id)
      if (result.success) {
        toast.success('Suggestion dismissed')
        router.push('/dashboard/crm/duplicates')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to dismiss')
      }
    })
  }

  const emailA = suggestion.contactA.emails?.[0] ?? suggestion.contactA.email ?? '—'
  const emailB = suggestion.contactB.emails?.[0] ?? suggestion.contactB.email ?? '—'

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Confirming these two records are <strong>not</strong> duplicates:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">{suggestion.contactA.firstName} {suggestion.contactA.lastName}</p>
              <p className="text-muted-foreground">{emailA}</p>
            </div>
            <div>
              <p className="font-medium">{suggestion.contactB.firstName} {suggestion.contactB.lastName}</p>
              <p className="text-muted-foreground">{emailB}</p>
            </div>
          </div>
          {suggestion.matchReason && (
            <p className="text-muted-foreground text-xs">
              Match reason: {suggestion.matchReason} ({suggestion.confidenceScore}% confidence)
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        This suggestion will be marked as dismissed. The two contacts will remain as separate records.
        This action can be reversed by re-running the deduplication scan.
      </p>

      <div className="flex gap-3">
        <Button
          variant="destructive"
          onClick={handleDismiss}
          disabled={isPending}
        >
          {isPending ? 'Dismissing…' : 'Dismiss Suggestion'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
