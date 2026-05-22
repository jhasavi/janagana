import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/header'
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary'
import { getTenant } from '@/lib/tenant'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let tenant = null

  try {
    tenant = await getTenant()
  } catch (error) {
    console.error('[DashboardLayout] tenant resolution failed', error)
  }

  if (!tenant) {
    // Distinguish: user has existing org memberships (pick one) vs truly zero
    // orgs (must create first org).
    const { userId } = await auth()
    if (userId) {
      try {
        const client = await clerkClient()
        const memberships = await client.users.getOrganizationMembershipList({
          userId,
          limit: 2,
        })
        if (memberships.data.length > 0) {
          // User has at least one org but none is active yet — send to picker.
          redirect('/select-organization')
        }
      } catch (error) {
        console.error('[DashboardLayout] membership check failed', error)
      }
    }
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
