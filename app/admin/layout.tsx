import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isGlobalAdmin } from '@/lib/actions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  if (!(await isGlobalAdmin())) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  )
}
