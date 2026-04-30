'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { mergeContacts } from '@/lib/actions/duplicates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

interface Contact {
  id: string
  firstName: string
  lastName: string
  emails: string[]
  email: string | null
  phones: string[]
  phone: string | null
  lifecycleStage: string | null
  createdAt: Date
  _count: {
    donations: number
    eventRegistrations: number
    volunteerSignups: number
  }
}

interface Suggestion {
  id: string
  confidenceScore: number
  matchReason: string | null
  contactA: Contact
  contactB: Contact
}

export function MergeContactsForm({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [survivorId, setSurvivorId] = useState<string | null>(null)

  const handleMerge = () => {
    if (!survivorId) return
    const mergedId = survivorId === suggestion.contactA.id
      ? suggestion.contactB.id
      : suggestion.contactA.id

    startTransition(async () => {
      const result = await mergeContacts(suggestion.id, { survivorId, mergedId })
      if (result.success) {
        toast.success('Contacts merged successfully')
        router.push('/dashboard/crm/duplicates')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to merge contacts')
      }
    })
  }

  const contacts = [suggestion.contactA, suggestion.contactB]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {contacts.map((c) => {
          const isSelected = survivorId === c.id
          const email = c.emails?.[0] ?? c.email ?? '—'
          const phone = c.phones?.[0] ?? c.phone ?? '—'
          const activity = c._count.donations + c._count.eventRegistrations + c._count.volunteerSignups

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSurvivorId(c.id)}
              className={`text-left rounded-lg border-2 transition-colors ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300'
              }`}
            >
              <Card className="border-0 bg-transparent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {c.firstName} {c.lastName}
                    </CardTitle>
                    {isSelected && (
                      <Badge className="bg-indigo-600 text-white text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Keep this
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Added {format(new Date(c.createdAt), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Email:</span> {email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {phone}</p>
                  {c.lifecycleStage && (
                    <p><span className="text-muted-foreground">Stage:</span>{' '}
                      <Badge variant="outline" className="text-xs">{c.lifecycleStage}</Badge>
                    </p>
                  )}
                  <p className="pt-1">
                    <span className="text-muted-foreground">Activity:</span>{' '}
                    {c._count.donations} donation{c._count.donations !== 1 ? 's' : ''},&nbsp;
                    {c._count.eventRegistrations} event{c._count.eventRegistrations !== 1 ? 's' : ''},&nbsp;
                    {c._count.volunteerSignups} volunteer record{c._count.volunteerSignups !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-0.5">
              <p className="font-medium">What happens during merge:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Survivor contact keeps its record ID and history</li>
                <li>All emails and phones from both records are combined</li>
                <li>All linked data (donations, events, volunteer records) is re-pointed to survivor</li>
                <li>Merged contact is flagged as archived — it is not deleted</li>
                <li>This action is audited and logged</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleMerge}
          disabled={!survivorId || isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isPending ? 'Merging…' : 'Confirm Merge'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
