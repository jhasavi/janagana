'use client'

import { useTransition } from 'react'
import { Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { approveVolunteerHours, rejectVolunteerHours } from '@/lib/actions/volunteers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VolunteerSignup, Member } from '@prisma/client'

type SignupWithMember = VolunteerSignup & { member: Member }

const hoursStatusConfig = {
  PENDING:  { label: 'Pending',  variant: 'warning'     as const },
  APPROVED: { label: 'Approved', variant: 'success'     as const },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const },
}

interface Props {
  signups: SignupWithMember[]
  opportunityId: string
}

export function HoursApprovalPanel({ signups, opportunityId }: Props) {
  const [isPending, startTransition] = useTransition()

  const pendingSignups = signups.filter(
    (s) => s.hoursLogged !== null && s.hoursStatus === 'PENDING'
  )
  const reviewedSignups = signups.filter(
    (s) => s.hoursLogged !== null && s.hoursStatus !== 'PENDING' && s.hoursStatus !== null
  )

  function handleApprove(signupId: string) {
    startTransition(async () => {
      const result = await approveVolunteerHours(signupId)
      if (result.success) toast.success('Hours approved')
      else toast.error(result.error ?? 'Failed to approve hours')
    })
  }

  function handleReject(signupId: string) {
    startTransition(async () => {
      const result = await rejectVolunteerHours(signupId)
      if (result.success) toast.success('Hours rejected')
      else toast.error(result.error ?? 'Failed to reject hours')
    })
  }

  if (pendingSignups.length === 0 && reviewedSignups.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Hours Approval
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingSignups.length === 0 && (
          <p className="text-sm text-muted-foreground py-1">No pending hours to review.</p>
        )}

        {pendingSignups.map((signup) => (
          <div
            key={signup.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-warning/5 border-warning/30"
          >
            <div>
              <p className="text-sm font-medium">
                {signup.member.firstName} {signup.member.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {signup.hoursLogged}h logged
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="warning">Pending</Badge>
              <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:border-green-300"
                    disabled={isPending}
                    title="Approve hours"
                    onClick={() => handleApprove(signup.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
              <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:border-destructive/30"
                    disabled={isPending}
                    title="Reject hours"
                    onClick={() => handleReject(signup.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
            </div>
          </div>
        ))}

        {reviewedSignups.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground pt-2">Reviewed</p>
            {reviewedSignups.map((signup) => {
              const cfg = hoursStatusConfig[signup.hoursStatus as keyof typeof hoursStatusConfig]
              return (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {signup.member.firstName} {signup.member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {signup.hoursLogged}h logged
                      {signup.hoursApproved !== null && ` · ${signup.hoursApproved}h approved`}
                    </p>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              )
            })}
          </>
        )}
      </CardContent>
    </Card>
  )
}
