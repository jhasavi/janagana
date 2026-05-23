import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'
import SelectOrgClient from './SelectOrgClient'

export const metadata = { title: 'Select Organization' }

export default async function SelectOrganizationPage() {
  const { userId } = await getCurrentIdentity()
  if (!userId) redirect('/sign-in')

  const memberships = await getUserOrgMemberships(userId)

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug ?? '',
    imageUrl: m.organization.imageUrl ?? null,
    role: m.role,
  }))

  if (orgs.length === 0) {
    redirect('/onboarding')
  }

  // If there is exactly one org, keep dashboard auto-entry behavior.
  // For multi-org users, always render picker so switching remains possible.
  let activeTenant = null
  try {
    activeTenant = await getTenant()
  } catch {
    // ignore — we'll let the user pick below
  }
  if (activeTenant && orgs.length === 1) {
    redirect('/dashboard')
  }

  return <SelectOrgClient orgs={orgs} />
}
