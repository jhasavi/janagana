import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getEmailCampaign } from '@/lib/actions/communications'
import { Button } from '@/components/ui/button'
import { EmailCampaignForm } from '../../_components/email-campaign-form'
import { requireTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Edit Campaign' }

export default async function EditEmailCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [result, tenant] = await Promise.all([getEmailCampaign(id), requireTenant()])
  if (!result.success || !result.data) notFound()

  const campaign = result.data
  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/communications/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>
      <EmailCampaignForm
        tiers={tiers}
        initialData={{
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          htmlBody: campaign.htmlBody,
          status: campaign.status,
          targetTierIds: campaign.targetTierIds,
          targetStatuses: campaign.targetStatuses as Array<'ACTIVE' | 'PENDING' | 'INACTIVE' | 'BANNED'>,
        }}
      />
    </div>
  )
}
