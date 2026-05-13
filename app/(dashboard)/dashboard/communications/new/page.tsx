import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailCampaignForm } from '../_components/email-campaign-form'
import { requireTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'New Campaign' }

export default async function NewCommunicationsPage() {
  const tenant = await requireTenant()
  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/communications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>
      <EmailCampaignForm tiers={tiers} />
    </div>
  )
}
