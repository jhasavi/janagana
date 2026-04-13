import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserTenant } from '@/lib/actions'
import Sidebar from '@/components/portal/Sidebar'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const tenant = await getUserTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar tenantName={tenant.name} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
