import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { AnnouncementsController } from './announcements/announcements.controller';
import { AnnouncementsService } from './announcements/announcements.service';
import { CampaignsController } from './campaigns/campaigns.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { EmailService } from './email/email.service';
import { EmailQueueService } from './queues/email.queue';
import { EmailProcessorService } from './queues/email.processor';
import { NotificationQueueService } from './queues/notification.queue';
import { NotificationProcessorService } from './queues/notification.processor';

@Module({
  imports: [AuditModule],
  controllers: [
    CommunicationsController,
    AnnouncementsController,
    CampaignsController,
    NotificationsController,
    WebhooksController,
  ],
  providers: [
    CommunicationsService,
    AnnouncementsService,
    CampaignsService,
    NotificationsService,
    EmailService,
    EmailQueueService,
    EmailProcessorService,
    NotificationQueueService,
    NotificationProcessorService,
  ],
  exports: [
    CommunicationsService,
    AnnouncementsService,
    CampaignsService,
    NotificationsService,
    EmailService,
  ],
})
export class CommunicationsModule {}
