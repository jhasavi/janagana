import type { Metadata } from 'next'
import Link from 'next/link'
import { FileClock, Key, Webhook, LayoutList, ShieldCheck } from 'lucide-react'
import { SettingsForm } from './_components/settings-form'
import { getTenantSettings } from '@/lib/actions/tenant'
import { getTiers } from '@/lib/actions/members'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HelpButton } from '@/components/dashboard/help-button'
import { MembershipTiersManager } from './_components/membership-tiers-manager'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const [settingsResult, tiersResult] = await Promise.all([
    getTenantSettings(),
    getTiers(),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your organization profile and preferences.
          </p>
        </div>
        <HelpButton
          title="Organization Settings"
          content="Configure your organization's profile, branding, and contact information. These settings appear on the member portal and in communications."
          link="/dashboard/help/settings/organization-settings"
        />
      </div>
      <SettingsForm initialData={settingsResult.success ? settingsResult.data : null} />

      <MembershipTiersManager initialTiers={tiersResult.data ?? []} />

      <Separator />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Administration</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/organization-console">
              <ShieldCheck className="h-4 w-4" />
              Organization Console
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/custom-fields">
              <LayoutList className="h-4 w-4" />
              Custom Fields
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/audit">
              <FileClock className="h-4 w-4" />
              Audit Log
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/api-keys">
              <Key className="h-4 w-4" />
              API Keys
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/webhooks">
              <Webhook className="h-4 w-4" />
              Webhooks
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
