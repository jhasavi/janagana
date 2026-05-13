'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Users, ArrowRight, Loader2 } from 'lucide-react'
import { completeOnboarding } from '@/lib/actions/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type OnboardingClientProps = {
  appName: string
  defaultOrganizationName: string
  defaultTimezone: string
  defaultPrimaryColor: string
}

export default function OnboardingClient({
  appName,
  defaultOrganizationName,
  defaultTimezone,
  defaultPrimaryColor,
}: OnboardingClientProps) {
  const router = useRouter()
  const { setActive, isLoaded } = useOrganizationList()
  const [isPending, startTransition] = useTransition()
  const [orgName, setOrgName] = useState(defaultOrganizationName)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || !isLoaded) return

    startTransition(async () => {
      const result = await completeOnboarding({
        orgName: orgName.trim(),
        timezone: defaultTimezone,
        primaryColor: defaultPrimaryColor,
      })
      if (result.success) {
        toast.success(`Organization created! Welcome to ${appName}.`)
        const orgId = result.data?.orgId
        const tenantId = result.data?.tenant?.id
        const apiKeyCreated = Boolean(result.data?.provisioning?.apiKeyCreated)

        // Set the Clerk active org in the client session so auth().orgId
        // is immediately available on the next server render.
        if (orgId && setActive) {
          try {
            await setActive({ organization: orgId })
          } catch (e) {
            console.error('[onboarding] setActive failed', e)
          }
        }

        // Always set short-lived server cookies as a reliability fallback while
        // Clerk org context propagates.
        try {
          await fetch('/api/active-org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId, tenantId }),
          })
        } catch (fetchErr) {
          console.error('[onboarding] active-org cookie set failed', fetchErr)
        }

        if (apiKeyCreated) {
          toast.message('Default integration API key provisioned for this workspace.')
        }

        router.replace('/dashboard')
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
            Create your {appName} workspace to manage members, events, and volunteers.
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
                  placeholder={defaultOrganizationName || 'e.g. Riverside Community Association'}
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
