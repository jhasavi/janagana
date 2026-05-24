import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'
import SelectOrgClient from './SelectOrgClient'

export const metadata = { title: 'Select Organization' }

export default async function SelectOrganizationPage() {
  const identity = await getCurrentIdentity()
  const { userId } = identity
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

  let signedInUser = {
    name: null as string | null,
    email: identity.email,
    imageUrl: null as string | null,
    userId: identity.userId,
  }

  if (identity.mode === 'clerk') {
    const user = await currentUser().catch(() => null)
    signedInUser = {
      name: user?.fullName ?? null,
      email: user?.primaryEmailAddress?.emailAddress ?? identity.email,
      imageUrl: user?.imageUrl ?? null,
      userId: identity.userId,
    }
  }

  return <SelectOrgClient orgs={orgs} signedInUser={signedInUser} />
}
