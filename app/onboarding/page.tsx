import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { getTenantProfile } from '@/lib/tenant-profile'
import { getPlatformBrandName } from '@/lib/platform-brand'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const tenant = await getTenant()
  if (tenant) {
    redirect('/dashboard')
  }

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

