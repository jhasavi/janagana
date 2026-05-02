import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { getTiers } from '@/lib/actions/members'
import { MemberForm } from '../_components/member-form'

export const metadata: Metadata = { title: 'Add Membership' }

export default async function NewMemberPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const tiersResult = await getTiers()
  const tiers = tiersResult.data ?? []

  return <MemberForm tiers={tiers} />
}
