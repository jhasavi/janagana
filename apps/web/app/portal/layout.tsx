import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Calendar, LogOut } from 'lucide-react'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/portal" className="text-xl font-bold text-blue-700">
            Member Portal
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/portal/profile"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-700"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            <Link
              href="/portal/events"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-700"
            >
              <Calendar className="w-4 h-4" />
              Events
            </Link>
            <Link
              href="/sign-out"
              className="flex items-center gap-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
