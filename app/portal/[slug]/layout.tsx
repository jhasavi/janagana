import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { LayoutDashboard, CalendarDays, Heart, CreditCard, LogOut, IdCard, Users, ClipboardCheck } from 'lucide-react'
import { getPortalContext } from '@/lib/actions/portal'
import { cn } from '@/lib/utils'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { slug } = await params
  const ctx = await getPortalContext(slug)

  if (!ctx) {
    // Authenticated but no Member record for this org
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold">No membership found</h1>
          <p className="text-muted-foreground">
            Your account is not linked to a membership in this organization.
            Please contact your organization administrator.
          </p>
        </div>
      </div>
    )
  }

  const nav = [
    { label: 'My Profile', href: `/portal/${slug}`, icon: LayoutDashboard },
    { label: 'Events', href: `/portal/${slug}/events`, icon: CalendarDays },
    { label: 'Volunteer', href: `/portal/${slug}/volunteers`, icon: Heart },
    { label: 'Directory', href: `/portal/${slug}/directory`, icon: Users },
    { label: 'Membership', href: `/portal/${slug}/membership`, icon: CreditCard },
    { label: 'Surveys', href: `/portal/${slug}/surveys`, icon: ClipboardCheck },
    { label: 'My Card', href: `/portal/${slug}/card`, icon: IdCard },
  ]

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div
              className="h-7 w-7 rounded-full"
              style={{ backgroundColor: ctx.tenant.primaryColor }}
            />
            <span className="font-semibold text-sm">{ctx.tenant.name}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Member Portal
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {ctx.member.firstName} {ctx.member.lastName}
            </span>
            <Link href="/sign-out" className="hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0 space-y-1">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
