'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, DollarSign, CreditCard, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

const items: BottomNavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Events', href: '/events', icon: CalendarDays },
  { label: 'Donations', href: '/donations', icon: DollarSign },
  { label: 'Membership', href: '/membership', icon: CreditCard },
  { label: 'Support', href: '/support', icon: MessageSquare },
]

export function PortalBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-6xl justify-between px-4 py-2">
        {items.map((item) => {
          const href = `/portal/${slug}${item.href}`
          const active = pathname === href || pathname?.startsWith(href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500',
                active && 'text-slate-900'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
