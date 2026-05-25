import type { Metadata } from 'next'
import Link from 'next/link'
import { PlugZap } from 'lucide-react'
import { getTenant } from '@/lib/tenant'
import {
  getSimplifiedTenantProfile,
  getSimplifiedTenantProfileValidationErrors,
} from '@/lib/tenant-profile-simplified'
import { IntegrationsClient } from './_components/integrations-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Integrations' }

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function getSafeAppBaseUrl() {
  const fallback =
    process.env.TENANT_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ''

  const errors = getSimplifiedTenantProfileValidationErrors()
  if (errors.length > 0) return trimTrailingSlash(fallback)

  try {
    return trimTrailingSlash(getSimplifiedTenantProfile().baseUrls.app || fallback)
  } catch (error) {
    console.error('[IntegrationsPage] tenant profile unavailable', error)
    return trimTrailingSlash(fallback)
  }
}

export default async function IntegrationsPage() {
  const tenant = await getTenant()
  const tenantSlug = tenant?.slug ?? ''
  const appBaseUrl = getSafeAppBaseUrl()

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

      <Card className="border-slate-200 bg-slate-50 p-6">
        <CardHeader>
          <CardTitle className="text-base">Need help with integration?</CardTitle>
          <CardDescription>
            Use the step-by-step integration guide for web, WordPress, Next.js, and custom API workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              The guide walks you through script installation, widget setup, and CRM verification so you can complete the integration faster.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/help/integrations/website-integration-quick-start">Integration Quick Start</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/help">Help Center</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <IntegrationsClient tenantSlug={tenantSlug} appBaseUrl={appBaseUrl} />
    </div>
  )
}
