import { redirect } from 'next/navigation'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'

export default async function RootPage() {
  const identity = await getCurrentIdentity()

  if (!identity.userId) redirect('/sign-in')
  if (identity.orgId) redirect('/dashboard')

  const memberships = await getUserOrgMemberships(identity.userId)
  if (memberships.length === 0) redirect('/onboarding')
  if (memberships.length > 1) redirect('/select-organization')
  redirect('/dashboard')
}
