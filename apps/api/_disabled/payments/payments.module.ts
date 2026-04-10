import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';
import { CommunicationsModule } from '../communications/communications.module';
import { StripeService } from '../../payments/stripe.service';

@Module({
  imports: [CommunicationsModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
