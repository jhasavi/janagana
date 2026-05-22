import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { getTenantProfile } from '@/lib/tenant-profile'
import { getPlatformBrandName } from '@/lib/platform-brand'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  let tenant = null

  try {
    tenant = await getTenant()
  } catch (error) {
    console.error('[OnboardingPage] failed to resolve tenant', error)
  }

  if (tenant) {
    redirect('/dashboard')
  }

  // If the user already belongs to at least one organization but no tenant
  // resolved (e.g. multiple orgs, expired cookie), send them to the org picker
  // rather than showing the create-organization wizard.
  const { userId } = await auth()
  if (userId) {
    try {
      const client = await clerkClient()
      const memberships = await client.users.getOrganizationMembershipList({
        userId,
        limit: 2,
      })
      if (memberships.data.length > 0) {
        redirect('/select-organization')
      }
    } catch (error) {
      console.error('[OnboardingPage] membership check failed', error)
    }
  }

  // Truly zero org memberships — show the create-organization wizard.
  const platformName = getPlatformBrandName()
  let defaultOrgName = ''
  let defaultTimezone = 'America/New_York'
  let defaultPrimaryColor = '#4F46E5'
  try {
    const tenantProfile = getTenantProfile()
    defaultOrgName = tenantProfile.onboardingDefaults.defaultOrganizationName ?? ''
    defaultTimezone = tenantProfile.onboardingDefaults.timezone
    defaultPrimaryColor = tenantProfile.onboardingDefaults.primaryColor
  } catch {
    // env vars not configured; use defaults
  }

  return (
    <OnboardingClient
      platformName={platformName}
      defaultOrganizationName={defaultOrgName}
      defaultTimezone={defaultTimezone}
      defaultPrimaryColor={defaultPrimaryColor}
    />
  )
}

