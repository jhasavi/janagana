export interface NotificationItem {
  id: string;
  memberId: string;
  channel: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationCount {
  unreadCount: number;
}
