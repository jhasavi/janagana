'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
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
  CheckSquare,
  HelpCircle,
  PlugZap,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'Contacts', href: '/dashboard/crm', icon: UserCircle },
      { label: 'Companies', href: '/dashboard/crm/companies', icon: Building2 },
      { label: 'Deals', href: '/dashboard/crm/deals', icon: BarChart2 },
      { label: 'Tasks', href: '/dashboard/crm/tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Memberships', href: '/dashboard/members', icon: Users },
      { label: 'Events', href: '/dashboard/events', icon: CalendarDays },
      { label: 'Fundraising', href: '/dashboard/fundraising', icon: HeartHandshake },
      { label: 'Volunteering', href: '/dashboard/volunteers', icon: Heart },
      { label: 'Communications', href: '/dashboard/communications', icon: Mail },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Clubs', href: '/dashboard/clubs', icon: Users2 },
      { label: 'Chapters', href: '/dashboard/chapters', icon: Building2 },
      { label: 'Forum', href: '/dashboard/forum', icon: MessageSquare },
      { label: 'Forms', href: '/dashboard/forms', icon: ClipboardList },
      { label: 'Surveys', href: '/dashboard/surveys', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages', href: '/dashboard/pages', icon: FileText },
      { label: 'Gallery', href: '/dashboard/gallery', icon: Images },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Careers', href: '/dashboard/jobs', icon: Briefcase },
      { label: 'Governance', href: '/dashboard/governance', icon: Shield },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: PlugZap },
      { label: 'Organization Console', href: '/dashboard/settings/organization-console', icon: Shield },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Help', href: '/dashboard/help', icon: HelpCircle },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Jana Gana"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
            priority
          />
          <span className="text-sidebar-foreground font-semibold text-lg">Jana Gana</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navSections.map((section) => {
          const sectionActive = section.items.some((item) =>
            item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          )

          const isCollapsedOnMobile = collapsedSections[section.title] ?? false

          return (
            <div key={section.title} className="mb-4 last:mb-2">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="md:hidden w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60"
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', isCollapsedOnMobile && '-rotate-90')}
                />
              </button>
              <div className="hidden md:block px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                {section.title}
              </div>
              <div className={cn('space-y-1', isCollapsedOnMobile && 'hidden md:block')}>
                {section.items.map((item) => {
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
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        sectionActive && !isActive && 'text-sidebar-foreground/80'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
