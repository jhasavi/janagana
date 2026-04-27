import type { Metadata } from 'next'
import { getSmsOptInCount } from '@/lib/actions/communications'
import { getTiers } from '@/lib/actions/members'
import { SmsBlastClient } from './_components/sms-blast-client'

export const metadata: Metadata = { title: 'SMS Blast' }

export default async function SmsPage() {
  const [countResult, tiersResult] = await Promise.all([
    getSmsOptInCount(),
    getTiers(),
  ])

  const optInCount = countResult.data ?? 0
  const tiers = tiersResult.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SMS Blast</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send SMS messages to opted-in members. Currently{' '}
          <strong>{optInCount}</strong> member{optInCount !== 1 ? 's' : ''} have SMS opt-in enabled.
        </p>
      </div>
      <SmsBlastClient tiers={tiers} optInCount={optInCount} />
    </div>
  )
}
