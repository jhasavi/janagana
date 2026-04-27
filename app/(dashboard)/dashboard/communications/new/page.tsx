import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailCampaignForm } from '../_components/email-campaign-form'

export const metadata: Metadata = { title: 'New Campaign' }

export default function NewCommunicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/communications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>
      <EmailCampaignForm />
    </div>
  )
}
