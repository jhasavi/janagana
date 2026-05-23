import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTenant } from '@/lib/tenant'
import { getTenantProfile } from '@/lib/tenant-profile'
import { getPlatformBrandName } from '@/lib/platform-brand'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const activeOrgCookiePresent = Boolean(cookieStore.get('JG_ACTIVE_ORG')?.value)
  const selectedTenantIdPresent = Boolean(cookieStore.get('JG_TENANT_ID')?.value)
  let tenant = null

  try {
    tenant = await getTenant()
  } catch (error) {
    console.error('[OnboardingPage] failed to resolve tenant', error)
  }

  if (tenant) {
    logAuthOrgRedirectDecision({
      route: '/onboarding',
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent,
      selectedTenantIdPresent,
      redirectTarget: '/dashboard',
      reasonCode: 'ONE_ORG_AUTO_SELECT_DASHBOARD',
    })
    redirect('/dashboard')
  }

  // If the user already belongs to at least one organization but no tenant
  // resolved (e.g. multiple orgs, expired cookie), send them to the org picker
  // rather than showing the create-organization wizard.
  const { userId } = await getCurrentIdentity()
  if (userId) {
    try {
      const memberships = await getUserOrgMemberships(userId)
      if (memberships.length > 0) {
        logAuthOrgRedirectDecision({
          route: '/onboarding',
          userPresent: true,
          membershipCount: memberships.length,
          activeOrgCookiePresent,
          selectedTenantIdPresent,
          redirectTarget: '/select-organization',
          reasonCode: 'MULTI_ORG_REDIRECT_SELECT_ORG',
        })
        redirect('/select-organization')
      }
    } catch (error) {
      console.error('[OnboardingPage] membership check failed', error)
      logAuthOrgRedirectDecision({
        route: '/onboarding',
        userPresent: true,
        membershipCount: null,
        activeOrgCookiePresent,
        selectedTenantIdPresent,
        redirectTarget: '/select-organization',
        reasonCode: 'MULTI_ORG_REDIRECT_SELECT_ORG',
      })
      redirect('/select-organization')
    }
  }

  logAuthOrgRedirectDecision({
    route: '/onboarding',
    userPresent: Boolean(userId),
    membershipCount: 0,
    activeOrgCookiePresent,
    selectedTenantIdPresent,
    redirectTarget: '/onboarding',
    reasonCode: 'ZERO_ORGS_REDIRECT_ONBOARDING',
  })

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

