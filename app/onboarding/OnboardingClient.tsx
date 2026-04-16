'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Users, ArrowRight, Loader2 } from 'lucide-react'
import { completeOnboarding } from '@/lib/actions/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function OnboardingClient() {
  const router = useRouter()
  const { user } = useUser()
  const [isPending, startTransition] = useTransition()
  const [orgName, setOrgName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return

    startTransition(async () => {
      const result = await completeOnboarding(orgName.trim())
      if (result.success) {
        toast.success('Organization created! Welcome to Jana Gana.')
        try {
          const orgId = (result as any)?.data?.orgId
          const tenantId = (result as any)?.data?.tenant?.id
          if (orgId || tenantId) {
            try {
              await fetch('/api/active-org', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId, tenantId }),
              })
            } catch (e) {
              try {
                if (orgId) document.cookie = `JG_ACTIVE_ORG=${orgId}; path=/; max-age=60`
                if (tenantId) document.cookie = `JG_TENANT_ID=${tenantId}; path=/; max-age=60`
              } catch (err) {
                console.error('[onboarding] cookie fallback failed', err)
              }
            }
          }
        } catch (e) {
          console.error('[onboarding] active org cookie set failed', e)
        }

        await user?.reload()
        await router.push('/dashboard')
      } else {
        toast.error(result.error ?? 'Failed to create organization')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600 text-white">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your organization</h1>
          <p className="text-muted-foreground text-sm">
            Create your Jana Gana workspace to manage members, events, and volunteers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization details</CardTitle>
            <CardDescription>
              This will be the name of your membership organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Riverside Community Association"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!orgName.trim() || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
