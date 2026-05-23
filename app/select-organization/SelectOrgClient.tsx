'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { Building2, ArrowRight, Loader2, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Org = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  role: string
}

type Props = {
  orgs: Org[]
}

export default function SelectOrgClient({ orgs }: Props) {
  const router = useRouter()
  const { setActive, isLoaded } = useOrganizationList()
  const [isPending, startTransition] = useTransition()
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null)

  // If exactly one org, auto-select it immediately
  useEffect(() => {
    if (orgs.length === 1 && isLoaded) {
      void handleSelect(orgs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  async function handleSelect(orgId: string) {
    setSelectingOrgId(orgId)

    startTransition(async () => {
      try {
        // 1. Set the Clerk active organization (updates JWT session claims)
        if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== 'true' && isLoaded && setActive) {
          try {
            await setActive({ organization: orgId })
          } catch {
            // Non-fatal: Clerk session update can be slow. Cookie path below
            // is the authoritative fallback for server resolution.
          }
        }

        // 2. Sync to server-side cookies so DashboardLayout can read the
        //    active org without waiting for Clerk session propagation.
        let response: Response | null = null
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          response = await fetch('/api/active-org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId }),
          })

          if (response.ok) break
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 600))
          }
        }

        if (!response?.ok) {
          const payload = await response?.json().catch(() => null)
          const message = payload?.error ?? 'Failed to activate organization'
          toast.error(message)
          setSelectingOrgId(null)
          return
        }

        router.push('/dashboard')
      } catch (error) {
        console.error('[SelectOrgClient] handleSelect error', error)
        toast.error('Something went wrong. Please try again.')
        setSelectingOrgId(null)
      }
    })
  }

  // Single-org: show a loading state while auto-selecting
  if (orgs.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-slate-300">Loading your organization…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="mx-auto h-10 w-10 text-indigo-400 mb-4" />
          <h1 className="text-2xl font-bold text-white">Select an Organization</h1>
          <p className="mt-2 text-sm text-slate-400">
            You belong to multiple organizations. Choose which one to open.
          </p>
        </div>

        <div className="space-y-3">
          {orgs.map((org) => {
            const isSelecting = selectingOrgId === org.id
            const isDisabled = isPending

            return (
              <Card
                key={org.id}
                data-testid="organization-card"
                className="bg-slate-800/60 border-slate-700 hover:border-indigo-500 transition-colors cursor-pointer"
                onClick={() => !isDisabled && handleSelect(org.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {org.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.imageUrl}
                      alt={org.name}
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{org.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{org.role.replace('org:', '')}</p>
                  </div>

                  {isSelecting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
            onClick={() => router.push('/onboarding')}
            disabled={isPending}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Create a new organization
          </Button>
        </div>
      </div>
    </div>
  )
}
