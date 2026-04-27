'use client'

import { useState, useTransition } from 'react'
import { Bell, BellDot, Check, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/communications'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  isRead: boolean
  actionUrl: string | null
  createdAt: Date
}

interface NotificationsBellProps {
  initialNotifications: Notification[]
  initialUnread: number
}

export function NotificationsBell({ initialNotifications, initialUnread }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unread, setUnread] = useState(initialUnread)
  const [, startTransition] = useTransition()

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setUnread((v) => Math.max(0, v - 1))
    })
  }

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
      toast.success('All notifications marked as read')
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unread > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-medium">
                {unread > 9 ? '9+' : unread}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex items-start gap-2 p-3 cursor-pointer"
              onClick={() => !n.isRead && handleMarkRead(n.id)}
            >
              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-rose-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.isRead ? 'text-muted-foreground' : ''}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <Check className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
