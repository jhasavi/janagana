'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateApplicationStatus, convertApplicantToContact } from '@/lib/actions/jobApplications'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'

type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'

const TRANSITIONS: Record<Status, Status[]> = {
  SUBMITTED:    ['UNDER_REVIEW', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW:    ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER:        ['HIRED', 'REJECTED', 'WITHDRAWN'],
  HIRED:        [],
  REJECTED:     [],
  WITHDRAWN:    [],
}

const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  INTERVIEW:    'Interview',
  OFFER:        'Offer',
  HIRED:        'Hired',
  REJECTED:     'Rejected',
  WITHDRAWN:    'Withdrawn',
}

interface Props {
  applicationId: string
  currentStatus: string
  hasContact:    boolean
}

export function ApplicationActions({ applicationId, currentStatus, hasContact }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isConverting, startConvert] = useTransition()
  const [nextStatus, setNextStatus] = useState<Status | ''>('')
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const transitions = TRANSITIONS[currentStatus as Status] ?? []
  const isTerminal = transitions.length === 0

  const handleAdvance = () => {
    if (!nextStatus) return
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, {
        status: nextStatus,
        notes: notes || undefined,
        rejectionReason: nextStatus === 'REJECTED' ? rejectionReason || undefined : undefined,
      })
      if (result.success) {
        toast.success(`Status updated to ${STATUS_LABELS[nextStatus]}`)
        router.refresh()
        setNextStatus('')
        setNotes('')
        setRejectionReason('')
      } else {
        toast.error(result.error ?? 'Failed to update status')
      }
    })
  }

  const handleConvert = () => {
    startConvert(async () => {
      const result = await convertApplicantToContact(applicationId)
      if (result.success) {
        toast.success('Contact created and linked')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to convert')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isTerminal && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Advance to</Label>
              <Select onValueChange={(v) => setNextStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next status…" />
                </SelectTrigger>
                <SelectContent>
                  {transitions.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nextStatus === 'REJECTED' && (
              <div className="space-y-1">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Optional reason for rejection…"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this status change…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleAdvance}
              disabled={!nextStatus || isPending}
            >
              {isPending ? 'Saving…' : 'Update Status'}
            </Button>
          </div>
        )}

        {isTerminal && (
          <p className="text-sm text-muted-foreground">
            This application is in a terminal state ({STATUS_LABELS[currentStatus as Status]}) and cannot be advanced further.
          </p>
        )}

        {!hasContact && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Create a People record from this applicant&apos;s contact info and link it to this application.
            </p>
            <Button
              variant="outline"
              onClick={handleConvert}
              disabled={isConverting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isConverting ? 'Converting…' : 'Convert to Contact'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
