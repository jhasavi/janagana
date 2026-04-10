import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { NotificationQueueService } from '../queues/notification.queue';
import { AuditService } from '../../audit/audit.service';

interface NotificationFilters {
  status?: 'UNREAD' | 'READ' | 'ARCHIVED';
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    memberId: string,
    type: string,
    title: string,
    body: string,
    actionUrl?: string,
  ) {
    const notification = await this.db.notification.create({
      data: {
        tenantId,
        memberId,
        channel: 'IN_APP',
        type,
        title,
        body,
        actionUrl,
      },
    });

    await this.auditService.log(
      tenantId,
      null,
      'notification.create',
      `Notification created for member ${memberId}`,
      { memberId, type, title },
      'notification',
      notification.id,
    );

    return notification;
  }

  async createBulk(
    tenantId: string,
    memberIds: string[],
    type: string,
    title: string,
    body: string,
    actionUrl?: string,
  ) {
    const jobs = memberIds.map((memberId) => ({
      jobId: `notification-${tenantId}-${memberId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tenantId,
      memberId,
      type,
      title,
      body,
      actionUrl,
    }));
    await Promise.all(jobs.map((job) => this.notificationQueue.enqueueNotification(job)));

    await this.auditService.log(
      tenantId,
      null,
      'notification.bulk_create',
      `Bulk notification queued for ${jobs.length} members`,
      { memberIds, type, title },
      'notification',
    );

    return { queued: jobs.length };
  }

  async getForMember(tenantId: string, memberId: string, filters: NotificationFilters = {}) {
    return this.db.notification.findMany({
      where: { tenantId, memberId, ...(filters.status ? { status: filters.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getNewForMember(tenantId: string, memberId: string, since?: Date) {
    return this.db.notification.findMany({
      where: {
        tenantId,
        memberId,
        createdAt: { gt: since ?? new Date(0) },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async markRead(memberId: string, notificationId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, memberId: true },
    });
    if (!notification || notification.memberId !== memberId) {
      throw new NotFoundException('Notification not found');
    }
    return this.db.notification.update({
      where: { id: notificationId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async markAllRead(memberId: string, tenantId: string) {
    return this.db.notification.updateMany({
      where: { tenantId, memberId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async getUnreadCount(memberId: string, tenantId: string) {
    const result = await this.db.notification.count({
      where: { tenantId, memberId, status: 'UNREAD' },
    });
    return { unreadCount: result };
  }
}
