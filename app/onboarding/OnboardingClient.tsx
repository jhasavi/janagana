'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { toast } from 'sonner'
import {
  Users, ArrowRight, Loader2, LogOut, Check, Copy,
  CalendarPlus, UserPlus, Upload, ExternalLink, MessageSquare,
} from 'lucide-react'
import { completeOnboarding } from '@/lib/actions/tenant'
import { createTier } from '@/lib/actions/members'
import { createMember } from '@/lib/actions/members'
import { createEvent } from '@/lib/actions/events'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'profile' | 'tier' | 'urls' | 'first-member' | 'first-event' | 'done'

const STEP_ORDER: WizardStep[] = ['profile', 'tier', 'urls', 'first-member', 'first-event', 'done']
const STEP_LABELS: Record<WizardStep, string> = {
  profile: 'Profile',
  tier: 'Membership',
  urls: 'Your URLs',
  'first-member': 'First Member',
  'first-event': 'First Event',
  done: 'Launch',
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Phoenix',
  'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  'UTC',
]

const COLOR_PRESETS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#16A34A', '#0891B2', '#0369A1', '#374151', '#1E293B',
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type OnboardingClientProps = {
  platformName: string
  defaultOrganizationName: string
  defaultTimezone: string
  defaultPrimaryColor: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function UrlRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-3 py-2 text-xs truncate">{href}</code>
        <CopyButton value={href} />
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Button type="button" size="sm" variant="ghost">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
      {message}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingClient({
  platformName,
  defaultOrganizationName,
  defaultTimezone,
  defaultPrimaryColor,
}: OnboardingClientProps) {
  const router = useRouter()
  const { setActive, isLoaded } = useOrganizationList()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<WizardStep>('profile')

  // Step 1: profile
  const [orgName, setOrgName] = useState(defaultOrganizationName)
  const [timezone, setTimezone] = useState(defaultTimezone || 'America/New_York')
  const [primaryColor, setPrimaryColor] = useState(defaultPrimaryColor || '#4F46E5')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)

  // Step 2: tier
  const [tierName, setTierName] = useState('Member')
  const [tierFree, setTierFree] = useState(true)
  const [tierPrice, setTierPrice] = useState('0')
  const [tierStripePriceId, setTierStripePriceId] = useState('')
  const [tierError, setTierError] = useState<string | null>(null)

  // Step 4: first member
  const [memberFirstName, setMemberFirstName] = useState('')
  const [memberLastName, setMemberLastName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)

  // Step 5: first event
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventError, setEventError] = useState<string | null>(null)

  const slugPreview = useMemo(() => {
    const candidate = orgName.trim() || defaultOrganizationName || ''
    return candidate ? slugify(candidate) : 'your-workspace'
  }, [orgName, defaultOrganizationName])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const joinUrl    = tenantSlug ? `${origin}/join/${tenantSlug}` : ''
  const portalUrl  = tenantSlug ? `${origin}/portal/${tenantSlug}` : ''
  const eventsUrl  = tenantSlug ? `${origin}/events/${tenantSlug}` : ''
  const reportUrl  = tenantSlug ? `${origin}/portal/${tenantSlug}/support` : `${origin}/help/report`

  const currentIdx = STEP_ORDER.indexOf(step)

  // ─── Step Handlers ─────────────────────────────────────────────────────────

  function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || !isLoaded) return
    setProfileError(null)

    startTransition(async () => {
      const result = await completeOnboarding({
        orgName: orgName.trim(),
        timezone,
        primaryColor,
      })
      if (result.success) {
        const orgId = result.data?.orgId
        const slug  = result.data?.tenant?.slug
        const tenantId = result.data?.tenant?.id

        if (orgId && setActive) {
          try { await setActive({ organization: orgId }) } catch { /* ok */ }
        }
        try {
          await fetch('/api/active-org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId, tenantId }),
          })
        } catch { /* ok */ }

        toast.success(`Workspace created! Welcome to ${platformName}.`)
        setTenantSlug(slug ?? null)
        setStep('tier')
      } else {
        const msg = result.error ?? 'Failed to create organization'
        setProfileError(msg)
        toast.error(msg)
      }
    })
  }

  function handleCreateTier() {
    setTierError(null)
    if (!tierName.trim()) { setTierError('Tier name is required'); return }
    const priceCents = tierFree ? 0 : Math.round(parseFloat(tierPrice) * 100)
    if (!tierFree && (!isFinite(priceCents) || priceCents < 0)) { setTierError('Enter a valid price'); return }

    startTransition(async () => {
      const result = await createTier({
        name: tierName.trim(),
        priceCents,
        interval: 'ANNUAL',
        color: primaryColor,
        benefits: [],
        isActive: true,
        stripePriceId: tierStripePriceId.trim() || undefined,
      })
      if (result.success) {
        toast.success(`"${tierName}" tier created`)
        setStep('urls')
      } else {
        setTierError(result.error ?? 'Failed to create tier')
      }
    })
  }

  function handleAddMember() {
    setMemberError(null)
    if (!memberFirstName.trim()) { setMemberError('First name is required'); return }
    if (!memberLastName.trim())  { setMemberError('Last name is required'); return }
    if (!memberEmail.trim())     { setMemberError('Email is required'); return }
    if (!EMAIL_REGEX.test(memberEmail.trim())) { setMemberError('Enter a valid email address'); return }

    startTransition(async () => {
      const result = await createMember({
        firstName: memberFirstName.trim(),
        lastName:  memberLastName.trim(),
        email:     memberEmail.trim(),
        status:    'ACTIVE',
      })
      if (result.success) {
        toast.success(`${memberFirstName} added as a member`)
        setStep('first-event')
      } else {
        setMemberError(result.error ?? 'Failed to add member')
      }
    })
  }

  function handleCreateEvent() {
    setEventError(null)
    if (!eventTitle.trim()) { setEventError('Event title is required'); return }
    if (!eventDate)         { setEventError('Start date is required'); return }
    const start = new Date(eventDate)
    if (Number.isNaN(start.getTime())) { setEventError('Enter a valid start date'); return }
    if (start <= new Date()) { setEventError('Event start time must be in the future'); return }

    startTransition(async () => {
      const result = await createEvent({
        title: eventTitle.trim(),
        startDate: eventDate,
        status: 'DRAFT',
        format: 'IN_PERSON',
        priceCents: 0,
        tags: [],
      })
      if (result.success) {
        toast.success(`"${eventTitle}" created as a draft`)
        setStep('done')
      } else {
        setEventError(result.error ?? 'Failed to create event')
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: primaryColor }}>
              <Users className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your organization</h1>
          <p className="text-muted-foreground text-sm">Step {currentIdx + 1} of {STEP_ORDER.length} — {STEP_LABELS[step]}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / STEP_ORDER.length) * 100}%` }}
          />
        </div>

        {/* ── Step 1: Organization Profile ── */}
        {step === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization profile</CardTitle>
              <CardDescription>Tell us about your workspace. You can change this later in Settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile} className="space-y-4">
                {profileError && <ErrorAlert message={profileError} />}

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
                  <p className="text-xs text-muted-foreground">
                    Workspace slug: <span className="font-medium text-foreground">{slugPreview}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={isPending}>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Brand color</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={isPending}
                        onClick={() => setPrimaryColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${primaryColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <div className="relative h-7 w-7 rounded-full overflow-hidden border-2 border-transparent">
                      <div className="h-full w-full rounded-full" style={{ backgroundColor: primaryColor }} />
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={isPending}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Custom color"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{primaryColor}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={!orgName.trim() || isPending}>
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Save &amp; Continue <ArrowRight className="h-4 w-4" /></>}
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

        {/* ── Step 2: Membership Tier ── */}
        {step === 'tier' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create your first membership tier</CardTitle>
              <CardDescription>Define what members join. You can add more tiers later in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierError && <ErrorAlert message={tierError} />}

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
                  <Button type="button" size="sm" variant={tierFree ? 'default' : 'outline'} onClick={() => setTierFree(true)} disabled={isPending}>Free</Button>
                  <Button type="button" size="sm" variant={!tierFree ? 'default' : 'outline'} onClick={() => setTierFree(false)} disabled={isPending}>Paid</Button>
                </div>
                {!tierFree && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number" min="0" step="0.01" placeholder="25.00"
                        value={tierPrice} onChange={(e) => setTierPrice(e.target.value)}
                        className="w-32" disabled={isPending}
                      />
                      <span className="text-sm text-muted-foreground">/ year</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="stripe-price-id">Stripe Price ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input
                        id="stripe-price-id"
                        placeholder="price_..."
                        value={tierStripePriceId}
                        onChange={(e) => setTierStripePriceId(e.target.value)}
                        disabled={isPending}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add this now to enable online checkout, or add it later from Settings → Tiers.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateTier} disabled={isPending || !tierName.trim()} className="flex-1">
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Save &amp; Continue <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <Button variant="ghost" onClick={() => setStep('urls')} disabled={isPending}>Skip</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Public Entry Points ── */}
        {step === 'urls' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your public entry points</CardTitle>
              <CardDescription>Share these links with your members and on your website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {joinUrl && <UrlRow label="Join / Sign-up page" href={joinUrl} />}
              {portalUrl && <UrlRow label="Member portal" href={portalUrl} />}
              {eventsUrl && <UrlRow label="Public events page" href={eventsUrl} />}
              <Button onClick={() => setStep('first-member')} className="w-full">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: First Member ── */}
        {step === 'first-member' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add your first member</CardTitle>
              <CardDescription>Start building your member list, or skip and do this later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {memberError && <ErrorAlert message={memberError} />}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-first">First name</Label>
                  <Input id="m-first" placeholder="Jane" value={memberFirstName} onChange={(e) => setMemberFirstName(e.target.value)} disabled={isPending} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-last">Last name</Label>
                  <Input id="m-last" placeholder="Smith" value={memberLastName} onChange={(e) => setMemberLastName(e.target.value)} disabled={isPending} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-email">Email</Label>
                <Input id="m-email" type="email" placeholder="jane@example.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} disabled={isPending} />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddMember}
                  disabled={isPending || !memberFirstName.trim() || !memberLastName.trim() || !memberEmail.trim()}
                  className="flex-1"
                >
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : <><UserPlus className="h-4 w-4" /> Add Member</>}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/settings/organization-console/import-center?from=onboarding">
                    <Upload className="h-4 w-4" /> Import CSV
                  </Link>
                </Button>
                <Button variant="ghost" onClick={() => setStep('first-event')} disabled={isPending}>Skip</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: First Event ── */}
        {step === 'first-event' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create your first event</CardTitle>
              <CardDescription>Schedule an upcoming gathering. It will save as a draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventError && <ErrorAlert message={eventError} />}

              <div className="space-y-1.5">
                <Label htmlFor="ev-title">Event title</Label>
                <Input id="ev-title" placeholder="e.g. Annual General Meeting" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} disabled={isPending} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Start date &amp; time</Label>
                <Input id="ev-date" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} disabled={isPending} />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateEvent} disabled={isPending || !eventTitle.trim() || !eventDate} className="flex-1">
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><CalendarPlus className="h-4 w-4" /> Create Event</>}
                </Button>
                <Button variant="ghost" onClick={() => setStep('done')} disabled={isPending}>Skip</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 6: Done / Support Confirmation ── */}
        {step === 'done' && (
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                  <Check className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-emerald-800 dark:text-emerald-200">
                  You&apos;re all set!
                </CardTitle>
              </div>
              <CardDescription>Your workspace is configured and ready for members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-background p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                  Member support &amp; reporting
                </div>
                <p className="text-xs text-muted-foreground">
                  Members can report issues or request help at:
                </p>
                {reportUrl && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-xs truncate">{reportUrl}</code>
                    <CopyButton value={reportUrl} />
                  </div>
                )}
              </div>

              <div className="text-sm space-y-1.5">
                <p className="font-medium">What&apos;s next:</p>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> Add Stripe Price IDs to tiers for online billing</li>
                  <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> Install the member portal embed on your website</li>
                  <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> Invite additional admins from Settings</li>
                </ul>
              </div>

              <Button onClick={() => router.replace('/dashboard?onboardingComplete=1')} className="w-full">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
