'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Calendar, Heart, Settings } from 'lucide-react'

const navigation = [
  { name: 'Profile', href: '/portal/profile', icon: User },
  { name: 'Events', href: '/portal/events', icon: Calendar },
  { name: 'Volunteers', href: '/portal/volunteers', icon: Heart },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
]

export default function PortalSidebar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r min-h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold text-blue-700">{tenantName}</h1>
        <p className="text-sm text-gray-500 mt-1">Member Portal</p>
      </div>

      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
