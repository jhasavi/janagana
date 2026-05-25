'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useOrganizationList } from '@clerk/nextjs'
import { Building2, ArrowRight, Loader2, PlusCircle, LogOut } from 'lucide-react'
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
  signedInUser: {
    name: string | null
    email: string | null
    imageUrl: string | null
    userId: string | null
  }
}

export default function SelectOrgClient({ orgs, signedInUser }: Props) {
  const router = useRouter()
  const clerk = useClerk()
  const { setActive, isLoaded } = useOrganizationList()
  const [isPending, startTransition] = useTransition()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null)

  const handleSelect = useCallback(async (orgId: string) => {
    setSelectingOrgId(orgId)

    startTransition(async () => {
      let routed = false
      try {
        // 1. Set the Clerk active organization (updates JWT session claims)
        if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== 'true' && isLoaded && setActive) {
          try {
            await setActive({ organization: orgId })
          } catch (error) {
            console.warn('[SelectOrgClient] setActive failed, continuing with cookie sync fallback', error)
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
          return
        }

        routed = true
        router.push('/dashboard')
      } catch (error) {
        console.error('[SelectOrgClient] handleSelect error', error)
        toast.error('Something went wrong. Please try again.')
      } finally {
        if (!routed) {
          setSelectingOrgId(null)
        }
      }
    })
  }, [isLoaded, router, setActive, startTransition])

  // If exactly one org, auto-select it immediately
  useEffect(() => {
    if (orgs.length === 1 && isLoaded) {
      void handleSelect(orgs[0].id)
    }
  }, [handleSelect, isLoaded, orgs])

  async function handleSignOut() {
    setIsSigningOut(true)
    // Safety: if clerk.signOut() hangs or completes without redirecting, force-navigate after 3s.
    const safeNav = setTimeout(() => window.location.assign('/api/sign-out'), 3000)
    try {
      if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== 'true') {
        // Do NOT pass redirectUrl — Clerk v5 may resolve the Promise without navigating.
        // We always call window.location.assign after the await instead.
        await clerk.signOut()
      }
      clearTimeout(safeNav)
      window.location.assign('/api/sign-out')
    } catch {
      clearTimeout(safeNav)
      window.location.assign('/api/sign-out')
    }
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
        <Card className="mb-4 bg-slate-800/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                {signedInUser.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedInUser.imageUrl}
                    alt={signedInUser.name ?? signedInUser.email ?? 'Signed-in user'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                    {(signedInUser.name ?? signedInUser.email ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0" data-testid="signed-in-user-identity">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate">
                    {signedInUser.name ?? signedInUser.email ?? signedInUser.userId ?? 'Unknown user'}
                  </p>
                  {signedInUser.email ? (
                    <p className="text-xs text-slate-400 truncate">{signedInUser.email}</p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut || isPending}
                data-testid="select-org-sign-out"
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Wrong account? Sign out and switch account before choosing an organization.
            </p>
          </CardContent>
        </Card>

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
                className="bg-slate-800/60 border-slate-700 hover:border-indigo-500 transition-colors"
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => !isDisabled && handleSelect(org.id)}
                    disabled={isDisabled}
                    aria-busy={isSelecting}
                    aria-label={`Select organization ${org.name}`}
                    data-testid="select-org-button"
                    className="flex w-full items-center gap-4 p-4 text-left disabled:opacity-70 hover:bg-slate-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
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
                  </button>
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
            disabled={isPending || isSigningOut}
            data-testid="create-organization-cta"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Create a new organization
          </Button>
        </div>
      </div>
    </div>
  )
}
