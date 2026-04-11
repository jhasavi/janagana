import { Controller, Get } from '@nestjs/common';

@Controller('webhooks')
export class WebhooksController {
  @Get()
  getWebhooks() {
    return { status: 'coming-soon' };
  }
}
