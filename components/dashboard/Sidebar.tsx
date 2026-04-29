'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Heart,
  Settings,
  BarChart2,
  Users2,
  HeartHandshake,
  Mail,
  Briefcase,
  MessageSquare,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Images,
  ChevronRight,
  Building2,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/dashboard/members', icon: Users },
  { label: 'Events', href: '/dashboard/events', icon: CalendarDays },
  { label: 'Volunteers', href: '/dashboard/volunteers', icon: Heart },
  { label: 'Clubs', href: '/dashboard/clubs', icon: Users2 },
  { label: 'Fundraising', href: '/dashboard/fundraising', icon: HeartHandshake },
  { label: 'Communications', href: '/dashboard/communications', icon: Mail },
  { label: 'Forum', href: '/dashboard/forum', icon: MessageSquare },
  { label: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { label: 'Forms', href: '/dashboard/forms', icon: ClipboardList },
  { label: 'Chapters', href: '/dashboard/chapters', icon: Building2 },
  { label: 'Pages', href: '/dashboard/pages', icon: FileText },
  { label: 'Gallery', href: '/dashboard/gallery', icon: Images },
  { label: 'Surveys', href: '/dashboard/surveys', icon: ClipboardCheck },
  { label: 'CRM', href: '/dashboard/crm', icon: UserCircle },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">JG</span>
          </div>
          <span className="text-sidebar-foreground font-semibold text-lg">Jana Gana</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
