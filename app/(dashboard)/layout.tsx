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
