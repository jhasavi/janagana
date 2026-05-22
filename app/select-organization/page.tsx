import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import SelectOrgClient from './SelectOrgClient'

export const metadata = { title: 'Select Organization' }

export default async function SelectOrganizationPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // If a tenant is already active (cookie + active org), skip straight to dashboard
  let activeTenant = null
  try {
    activeTenant = await getTenant()
  } catch {
    // ignore — we'll let the user pick below
  }
  if (activeTenant) redirect('/dashboard')

  const client = await clerkClient()
  const membershipsResult = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  })

  const orgs = membershipsResult.data.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug ?? '',
    imageUrl: m.organization.imageUrl ?? null,
    role: m.role,
  }))

  if (orgs.length === 0) {
    redirect('/onboarding')
  }

  return <SelectOrgClient orgs={orgs} />
}
