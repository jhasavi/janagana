import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import { getAdminNotifications, getUnreadNotificationCount } from '@/lib/actions/communications'
import { NotificationsBell } from '@/components/dashboard/notifications-bell'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'
import { GlobalCreate } from '@/components/dashboard/global-create'

interface HeaderProps {
  title?: string
}

export async function Header({ title }: HeaderProps) {
  let notifications: any[] = []
  let unread = 0

  try {
    const [notifResult, countResult] = await Promise.all([
      getAdminNotifications(),
      getUnreadNotificationCount(),
    ])
    notifications = (notifResult.data ?? []) as any[]
    unread = countResult.data ?? 0
  } catch (error) {
    console.error('[Header]', error)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        {title && (
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        <GlobalCreate />
        <ThemeToggle />
        <NotificationsBell initialNotifications={notifications} initialUnread={unread} />
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              organizationSwitcherTrigger:
                'flex items-center gap-2 px-3 py-1.5 rounded-md border border-input hover:bg-accent text-sm font-medium',
            },
          }}
        />
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
