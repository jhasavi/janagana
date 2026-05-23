import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/header'
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary'
import { getTenant } from '@/lib/tenant'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import { getCurrentIdentity, getUserOrgMemberships } from '@/lib/auth/auth-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const activeOrgCookiePresent = Boolean(cookieStore.get('JG_ACTIVE_ORG')?.value)
  const selectedTenantIdPresent = Boolean(cookieStore.get('JG_TENANT_ID')?.value)
  let tenant = null

  try {
    tenant = await getTenant()
  } catch (error) {
    console.error('[DashboardLayout] tenant resolution failed', error)
  }

  if (!tenant) {
    // Distinguish: user has existing org memberships (pick one) vs truly zero
    // orgs (must create first org).
    const { userId } = await getCurrentIdentity()
    if (userId) {
      try {
        const memberships = await getUserOrgMemberships(userId)
        if (memberships.length > 0) {
          logAuthOrgRedirectDecision({
            route: '/dashboard',
            userPresent: true,
            membershipCount: memberships.length,
            activeOrgCookiePresent,
            selectedTenantIdPresent,
            redirectTarget: '/select-organization',
            reasonCode: 'MULTI_ORG_REDIRECT_SELECT_ORG',
          })
          // User has at least one org but none is active yet — send to picker.
          redirect('/select-organization')
        }
      } catch (error) {
        console.error('[DashboardLayout] membership check failed', error)
        logAuthOrgRedirectDecision({
          route: '/dashboard',
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
      route: '/dashboard',
      userPresent: Boolean(userId),
      membershipCount: 0,
      activeOrgCookiePresent,
      selectedTenantIdPresent,
      redirectTarget: '/onboarding',
      reasonCode: 'ZERO_ORGS_REDIRECT_ONBOARDING',
    })
    // Zero orgs — must complete onboarding to create the first org.
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar brandName={tenant.name} logoUrl={tenant.logoUrl} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header orgName={tenant.name} />
        <main className="flex-1 overflow-y-auto p-6">
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </main>
      </div>
    </div>
  )
}
