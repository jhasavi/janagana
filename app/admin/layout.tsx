import { redirect } from 'next/navigation'
import { requireGlobalAdmin } from '@/lib/actions/admin'
import { Shield } from 'lucide-react'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireGlobalAdmin()

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🚫</div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            This area is restricted to global administrators. Your email is not
            on the <code className="bg-muted px-1 rounded">GLOBAL_ADMIN_EMAILS</code> list.
          </p>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="font-semibold">Jana Gana Global Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {admin.emailAddresses.find((e) => e.id === admin.primaryEmailAddressId)?.emailAddress}
            </span>
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
              Exit Admin
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
