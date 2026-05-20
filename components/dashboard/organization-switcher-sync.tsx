'use client'

import { useEffect, useRef } from 'react'
import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

export function OrganizationSwitcherSync() {
  const pathname = usePathname()
  const router = useRouter()
  const { organization, isLoaded } = useOrganization()
  const lastSyncedOrgId = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !organization?.id || lastSyncedOrgId.current === organization.id) return

    const controller = new AbortController()
    lastSyncedOrgId.current = organization.id

    fetch('/api/active-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: organization.id }),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) router.refresh()
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[OrganizationSwitcherSync] failed to sync active organization', error)
      })

    return () => controller.abort()
  }, [isLoaded, organization?.id, router])

  return (
    <OrganizationSwitcher
      hidePersonal
      afterCreateOrganizationUrl={pathname}
      afterSelectOrganizationUrl={pathname}
      appearance={{
        elements: {
          organizationSwitcherTrigger:
            'flex items-center gap-2 px-3 py-1.5 rounded-md border border-input hover:bg-accent text-sm font-medium',
        },
      }}
    />
  )
}
