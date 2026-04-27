import type { WebhookEndpoint } from '@prisma/client'
import type { Metadata } from 'next'
import { Webhook } from 'lucide-react'
import { getWebhookEndpoints } from '@/lib/actions/webhooks'
import { WebhooksClient } from './_components/webhooks-client'

type WebhookEndpointWithCount = WebhookEndpoint & { _count: { deliveries: number } }

export const metadata: Metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  const result = await getWebhookEndpoints()
  const endpoints = (result.data ?? []) as WebhookEndpointWithCount[]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Webhook className="h-5 w-5" /> Webhooks
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Receive real-time notifications when events happen in your organization.
          All deliveries are signed with HMAC-SHA256.
        </p>
      </div>
      <WebhooksClient initialEndpoints={endpoints} />
    </div>
  )
}
