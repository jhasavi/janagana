import type { Metadata } from 'next'
import { PlugZap } from 'lucide-react'
import { getTenant } from '@/lib/tenant'
import { getTenantProfile } from '@/lib/tenant-profile'
import { IntegrationsClient } from './_components/integrations-client'

export const metadata: Metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
  const tenant = await getTenant()
  const tenantProfile = getTenantProfile()
  const tenantSlug = tenant?.slug ?? ''
  const appBaseUrl = tenantProfile.baseUrls.app

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlugZap className="h-5 w-5" /> Integrations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Install JanaGana on your website with tenant-ready snippets, preview widgets, and a test checklist.
        </p>
      </div>

      <IntegrationsClient tenantSlug={tenantSlug} appBaseUrl={appBaseUrl} />
    </div>
  )
}
