'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Calendar, Heart, Building2, Settings } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Building2 },
  { name: 'Members', href: '/dashboard/members', icon: Users },
  { name: 'Events', href: '/dashboard/events', icon: Calendar },
  { name: 'Volunteers', href: '/dashboard/volunteers', icon: Heart },
  { name: 'Clubs', href: '/dashboard/clubs', icon: Building2 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r min-h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold text-blue-700">{tenantName}</h1>
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
