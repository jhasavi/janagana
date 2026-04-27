import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCampaign } from '@/lib/actions/fundraising'
import { Button } from '@/components/ui/button'
import { CampaignForm } from '../../_components/campaign-form'

export const metadata: Metadata = { title: 'Edit Campaign' }

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getCampaign(id)
  if (!result.success || !result.data) notFound()
  const c = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/fundraising/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>
      <CampaignForm
        initialData={{
          id: c.id,
          title: c.title,
          description: c.description ?? undefined,
          goalCents: c.goalCents / 100,
          status: c.status,
          endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null,
        }}
      />
    </div>
  )
}
