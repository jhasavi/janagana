import { UserButton } from '@clerk/nextjs'
import { getAdminNotifications, getUnreadNotificationCount } from '@/lib/actions/communications'
import { NotificationsBell } from '@/components/dashboard/notifications-bell'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'
import { OrganizationSwitcherSync } from '@/components/dashboard/organization-switcher-sync'

interface HeaderProps {
  title?: string
  orgName?: string
}

interface HeaderNotification {
  id: string
  title: string
  body: string
  isRead: boolean
  actionUrl: string | null
  createdAt: Date
}

export async function Header({ title, orgName }: HeaderProps) {
  let notifications: HeaderNotification[] = []
  let unread = 0

  try {
    const [notifResult, countResult] = await Promise.all([
      getAdminNotifications(),
      getUnreadNotificationCount(),
    ])
    notifications = (notifResult.data ?? []) as HeaderNotification[]
    unread = countResult.data ?? 0
  } catch (error) {
    console.error('[Header]', error)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-foreground">
          {title ?? orgName ?? 'Dashboard'}
        </h1>
        {title && orgName && (
          <p className="truncate text-xs text-muted-foreground">{orgName}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationsBell initialNotifications={notifications} initialUnread={unread} />
        <OrganizationSwitcherSync />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  )
}
