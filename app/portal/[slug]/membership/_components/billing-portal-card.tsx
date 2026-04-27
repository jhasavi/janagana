'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { createBillingPortalSession } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BillingPortalCard({ slug, hasSubscription }: { slug: string; hasSubscription: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleManage = async () => {
    setLoading(true)
    const result = await createBillingPortalSession(slug)
    if (result.success && result.url) {
      window.location.href = result.url
    } else {
      toast.error(result.error ?? 'Failed to open billing portal')
      setLoading(false)
    }
  }

  if (!hasSubscription) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Billing Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your payment method, view invoices, or cancel your subscription.
        </p>
        <Button onClick={handleManage} disabled={loading} variant="outline">
          <ExternalLink className="h-4 w-4" />
          {loading ? 'Opening…' : 'Open Billing Portal'}
        </Button>
      </CardContent>
    </Card>
  )
}
