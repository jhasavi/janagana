import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CampaignForm } from '../_components/campaign-form'
export const metadata: Metadata = { title: 'New Campaign' }
export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon"><Link href="/dashboard/fundraising"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
      </div>
      <CampaignForm />
    </div>
  )
}
