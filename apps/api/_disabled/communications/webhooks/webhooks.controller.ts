import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DatabaseService } from '../../../database/database.service';

@ApiTags('Webhooks')
@Controller('communications')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly db: DatabaseService) {}

  @Post('webhooks/resend')
  @ApiOperation({ summary: 'Resend email webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  async handleResendWebhook(@Body() payload: Record<string, unknown>) {
    const type = payload['type'] as string | undefined;
    const data = payload['data'] as Record<string, unknown> | undefined;
    const messageId = data?.['id'] as string | undefined;
    const statusMap: Record<string, { field: string; value: boolean | string }> = {
      'message.delivered': { field: 'status', value: 'DELIVERED' },
      'message.opened': { field: 'openedAt', value: new Date().toISOString() },
      'message.clicked': { field: 'clickedAt', value: new Date().toISOString() },
      'message.bounced': { field: 'bouncedAt', value: new Date().toISOString() },
    };

    if (!messageId || !type || !statusMap[type]) {
      this.logger.warn(`Unhandled webhook event: ${type}`);
      return { received: true };
    }

    const update = statusMap[type];
    const dataUpdate: Record<string, unknown> = { [update.field]: update.value };
    if (update.field === 'status') dataUpdate.status = update.value;

    await this.db.emailLog.updateMany({
      where: { resendMessageId: messageId },
      data: dataUpdate,
    });

    return { received: true };
  }

  @Get('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from communications' })
  @ApiQuery({ name: 'email', required: true })
  async unsubscribe(@Query('email') email: string) {
    this.logger.log(`Unsubscribe request received for ${email}`);
    return { unsubscribed: email };
  }
}
