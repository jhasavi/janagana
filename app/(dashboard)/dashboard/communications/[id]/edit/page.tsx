import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getEmailCampaign } from '@/lib/actions/communications'
import { Button } from '@/components/ui/button'
import { EmailCampaignForm } from '../../_components/email-campaign-form'

export const metadata: Metadata = { title: 'Edit Campaign' }

export default async function EditEmailCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getEmailCampaign(id)
  if (!result.success || !result.data) notFound()

  const campaign = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/communications/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>
      <EmailCampaignForm
        initialData={{
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          htmlBody: campaign.htmlBody,
          status: campaign.status,
        }}
      />
    </div>
  )
}
