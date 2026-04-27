import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMember, getTiers } from '@/lib/actions/members'
import { MemberForm } from '../../_components/member-form'

export const metadata: Metadata = { title: 'Edit Member' }

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [memberResult, tiersResult] = await Promise.all([
    getMember(id),
    getTiers(),
  ])

  if (!memberResult.success || !memberResult.data) notFound()

  return (
    <MemberForm
      member={memberResult.data}
      tiers={tiersResult.data ?? []}
    />
  )
}
