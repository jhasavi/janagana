import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [WebhooksController],
  providers: [
    WebhookSubscriptionService,
    WebhookDeliveryService,
    DatabaseService,
  ],
  exports: [
    WebhookSubscriptionService,
    WebhookDeliveryService,
  ],
})
export class WebhooksModule {}
