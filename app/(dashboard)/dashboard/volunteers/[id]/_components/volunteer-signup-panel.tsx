'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { signUpForOpportunity, logVolunteerHours, cancelSignup } from '@/lib/actions/volunteers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Member, VolunteerSignup } from '@prisma/client'

type SignupWithMember = VolunteerSignup & { member: Pick<Member, 'id' | 'firstName' | 'lastName' | 'email'> }

interface Props {
  opportunityId: string
  members: Pick<Member, 'id' | 'firstName' | 'lastName' | 'email'>[]
  signedUpMembers?: SignupWithMember[]
}

export function VolunteerSignupPanel({ opportunityId, members, signedUpMembers = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [logMemberId, setLogMemberId] = useState('')
  const [hours, setHours] = useState('')

  // Derive signup id from selected member for logging
  const logSignup = signedUpMembers.find((s) => s.member.id === logMemberId)

  function handleSignup() {
    if (!selectedMemberId) return
    startTransition(async () => {
      const result = await signUpForOpportunity(opportunityId, selectedMemberId)
      if (result.success) {
        toast.success('Volunteer signed up')
        setSelectedMemberId('')
      } else {
        toast.error(result.error ?? 'Failed to sign up')
      }
    })
  }

  function handleLogHours() {
    if (!logSignup || !hours) return
    const parsed = parseFloat(hours)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid number of hours')
      return
    }
    startTransition(async () => {
      const result = await logVolunteerHours(logSignup.id, parsed)
      if (result.success) {
        toast.success('Hours submitted for approval')
        setLogMemberId('')
        setHours('')
      } else {
        toast.error(result.error ?? 'Failed to log hours')
      }
    })
  }

  const completedMembers = signedUpMembers.filter(
    (s) => s.status === 'CONFIRMED' || s.status === 'COMPLETED'
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sign Up Volunteer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">All active members are signed up.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="signup-member">Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger id="signup-member">
                    <SelectValue placeholder="Select member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleSignup}
                disabled={!selectedMemberId || isPending}
              >
                Sign Up
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {completedMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-member">Volunteer</Label>
              <Select value={logMemberId} onValueChange={setLogMemberId}>
                <SelectTrigger id="log-member">
                  <SelectValue placeholder="Select volunteer…" />
                </SelectTrigger>
                <SelectContent>
                  {completedMembers.map((s) => (
                    <SelectItem key={s.member.id} value={s.member.id}>
                      {s.member.firstName} {s.member.lastName}
                      {s.hoursLogged ? ` · ${s.hoursLogged}h logged` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-hours">Hours</Label>
              <Input
                id="log-hours"
                type="number"
                min="0.5"
                step="0.5"
                placeholder="e.g. 3.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLogHours}
              disabled={!logMemberId || !hours || isPending}
            >
              Submit Hours for Approval
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
