'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { portalSignupForVolunteer } from '@/lib/actions/portal'
import { formatDate } from '@/lib/utils'

type Opportunity = {
  id: string
  title: string
  description: string | null
  date: Date | null
  location: string | null
  hoursEstimate: number | null
  _count: { signups: number }
  capacity: number | null
}

interface PortalVolunteersClientProps {
  opportunities: Opportunity[]
  signedUpIds: string[]
  slug: string
}

export function PortalVolunteersClient({ opportunities, signedUpIds: initial, slug }: PortalVolunteersClientProps) {
  const [signedUp, setSignedUp] = useState(new Set(initial))
  const [isPending, startTransition] = useTransition()

  function handleSignup(oppId: string) {
    startTransition(async () => {
      const res = await portalSignupForVolunteer(slug, oppId)
      if (res.success) {
        setSignedUp((prev) => new Set([...prev, oppId]))
        toast.success('Signed up successfully!')
      } else {
        toast.error(res.error ?? 'Sign-up failed')
      }
    })
  }

  if (opportunities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No volunteer opportunities open right now.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opp) => {
        const isSignedUp = signedUp.has(opp.id)
        const isFull = opp.capacity != null && opp._count.signups >= opp.capacity

        return (
          <Card key={opp.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{opp.title}</h3>
                  {opp.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {opp.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {opp.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(opp.date)}
                      </span>
                    )}
                    {opp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {opp.location}
                      </span>
                    )}
                    {opp.hoursEstimate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{opp.hoursEstimate}h
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {isSignedUp ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Signed Up
                    </Badge>
                  ) : isFull ? (
                    <Badge variant="secondary">Full</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSignup(opp.id)}
                      disabled={isPending}
                    >
                      Sign Up
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
