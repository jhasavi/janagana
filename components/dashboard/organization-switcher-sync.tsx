'use client'

import { useEffect, useRef, useState } from 'react'
import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

export function OrganizationSwitcherSync() {
  const pathname = usePathname()
  const router = useRouter()
  const { organization, isLoaded } = useOrganization()
  const lastSyncedOrgId = useRef<string | null>(null)
  const syncRetries = useRef<Record<string, number>>({})
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    if (!isLoaded || !organization?.id || lastSyncedOrgId.current === organization.id) return

    const controller = new AbortController()

    fetch('/api/active-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: organization.id }),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          lastSyncedOrgId.current = organization.id
          syncRetries.current[organization.id] = 0
          router.refresh()
          return
        }

        const attempts = (syncRetries.current[organization.id] ?? 0) + 1
        syncRetries.current[organization.id] = attempts
        if (attempts <= 3) {
          setTimeout(() => setRetryNonce((value) => value + 1), 750)
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[OrganizationSwitcherSync] failed to sync active organization', error)
        const attempts = (syncRetries.current[organization.id] ?? 0) + 1
        syncRetries.current[organization.id] = attempts
        if (attempts <= 3) {
          setTimeout(() => setRetryNonce((value) => value + 1), 750)
        }
      })

    return () => controller.abort()
  }, [isLoaded, organization?.id, retryNonce, router])

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
