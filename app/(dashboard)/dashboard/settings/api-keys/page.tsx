import type { ApiKey } from '@prisma/client'
import type { Metadata } from 'next'
import { Key } from 'lucide-react'
import { getApiKeys } from '@/lib/actions/api-keys'
import { ApiKeysClient } from './_components/api-keys-client'

export const metadata: Metadata = { title: 'API Keys' }

export default async function ApiKeysPage() {
  const result = await getApiKeys()
  const keys = (result.data ?? []) as ApiKey[]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-5 w-5" /> API Keys
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use API keys to authenticate programmatic access to your organization&apos;s data.
        </p>
      </div>
      <ApiKeysClient initialKeys={keys} />
    </div>
  )
}
