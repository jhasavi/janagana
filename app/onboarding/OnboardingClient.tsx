'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Users, ArrowRight, Loader2, LogOut, Check, Copy, Star } from 'lucide-react'
import { completeOnboarding } from '@/lib/actions/tenant'
import { createTier } from '@/lib/actions/members'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type OnboardingClientProps = {
  platformName: string
  defaultOrganizationName: string
  defaultTimezone: string
  defaultPrimaryColor: string
}

type WizardStep = 'org' | 'tier' | 'launch'

export default function OnboardingClient({
  platformName,
  defaultOrganizationName,
  defaultTimezone,
  defaultPrimaryColor,
}: OnboardingClientProps) {
  const router = useRouter()
  const { setActive, isLoaded } = useOrganizationList()
  const [isPending, startTransition] = useTransition()

  // Step tracking
  const [step, setStep] = useState<WizardStep>('org')

  // Step 1 state
  const [orgName, setOrgName] = useState(defaultOrganizationName)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)

  // Step 2 state
  const [tierName, setTierName] = useState('Member')
  const [tierFree, setTierFree] = useState(true)
  const [tierPrice, setTierPrice] = useState('0')
  const [tierError, setTierError] = useState<string | null>(null)

  const slugPreview = useMemo(() => {
    const candidate = orgName.trim() || defaultOrganizationName || ''
    return candidate ? slugify(candidate) : 'your-workspace'
  }, [defaultOrganizationName, orgName])

  const portalUrl = tenantSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${tenantSlug}`
    : ''

  function handleSubmitOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || !isLoaded) return

    setErrorMessage(null)
    startTransition(async () => {
      const result = await completeOnboarding({
        orgName: orgName.trim(),
        timezone: defaultTimezone,
        primaryColor: defaultPrimaryColor,
      })
      if (result.success) {
        toast.success(`Organization created! Welcome to ${platformName}.`)
        const orgId = result.data?.orgId
        const slug = result.data?.tenant?.slug
        const tenantId = result.data?.tenant?.id
        const apiKeyCreated = Boolean(result.data?.provisioning?.apiKeyCreated)

        if (orgId && setActive) {
          try {
            await setActive({ organization: orgId })
          } catch (e) {
            console.error('[onboarding] setActive failed', e)
          }
        }

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

        setTenantSlug(slug ?? null)
        setStep('tier')
      } else {
        const error = result.error ?? 'Failed to create organization'
        setErrorMessage(error)
        toast.error(error)
      }
    })
  }

  function handleCreateTier() {
    setTierError(null)
    if (!tierName.trim()) {
      setTierError('Tier name is required')
      return
    }
    const priceCents = tierFree ? 0 : Math.round(parseFloat(tierPrice) * 100)
    if (!tierFree && (!isFinite(priceCents) || priceCents < 0)) {
      setTierError('Enter a valid price')
      return
    }
    startTransition(async () => {
      const result = await createTier({
        name: tierName.trim(),
        priceCents,
        interval: 'ANNUAL',
        color: '#4F46E5',
        benefits: [],
        isActive: true,
      })
      if (result.success) {
        toast.success(`"${tierName}" tier created`)
        setStep('launch')
      } else {
        setTierError(result.error ?? 'Failed to create tier')
      }
    })
  }

  const stepOrder: WizardStep[] = ['org', 'tier', 'launch']
  const stepLabels: Record<WizardStep, string> = { org: 'Organization', tier: 'Membership', launch: 'Launch' }
  const currentIdx = stepOrder.indexOf(step)

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600 text-white">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Dynamic subtitle per step */}
          <h1 className="text-2xl font-bold tracking-tight">Set up your organization</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'org' && `Create your ${platformName} workspace to manage members, events, and volunteers.`}
            {step === 'tier' && 'Add a membership tier so members know what plans are available.'}
            {step === 'launch' && "You're all set! Your workspace is ready to go."}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1">
          {stepOrder.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : i < currentIdx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < currentIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${s === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepLabels[s]}
              </span>
              {i < stepOrder.length - 1 && <div className="h-px w-5 bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Organization name */}
        {step === 'org' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization details</CardTitle>
              <CardDescription>This will be the name of your membership organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrg} className="space-y-4">
                {errorMessage && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                    <p className="font-semibold">Onboarding failed</p>
                    <p className="mt-2">{errorMessage}</p>
                  </div>
                )}
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
                  <p className="text-sm text-muted-foreground">
                    Workspace slug:{' '}
                    <span className="font-medium text-foreground">{slugPreview}</span>
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={!orgName.trim() || isPending}>
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <>Continue <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
                <Link
                  href="/sign-in"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Use a different account
                </Link>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Membership tier */}
        {step === 'tier' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create your first membership tier</CardTitle>
              <CardDescription>Define what members will join. You can add more tiers later from Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                  {tierError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="tier-name">Tier name</Label>
                <Input
                  id="tier-name"
                  placeholder="e.g. Annual Member"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Pricing</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={tierFree ? 'default' : 'outline'}
                    onClick={() => setTierFree(true)}
                    disabled={isPending}
                  >
                    Free
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!tierFree ? 'default' : 'outline'}
                    onClick={() => setTierFree(false)}
                    disabled={isPending}
                  >
                    Paid
                  </Button>
                </div>
                {!tierFree && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="25.00"
                      value={tierPrice}
                      onChange={(e) => setTierPrice(e.target.value)}
                      className="w-32"
                      disabled={isPending}
                    />
                    <span className="text-sm text-muted-foreground">/ year</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTier}
                  disabled={isPending || !tierName.trim()}
                  className="flex-1"
                >
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <>Create Tier <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setStep('launch')} disabled={isPending}>
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Launch */}
        {step === 'launch' && (
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                  <Check className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-emerald-800 dark:text-emerald-200">
                  Your workspace is ready
                </CardTitle>
              </div>
              <CardDescription>Share your member portal or finish setup from the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {portalUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Your member portal URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-xs truncate">{portalUrl}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(portalUrl)
                        toast.success('Copied to clipboard!')
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Suggested next steps:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Add Stripe pricing to your tiers for online billing
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Invite your first members
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Create your first event
                  </li>
                </ul>
              </div>
              <Button onClick={() => router.replace('/dashboard?onboardingComplete=1')} className="w-full">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
