import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { StripeService } from '../../payments/stripe.service';

@ApiTags('Webhooks')
@Controller('webhooks/stripe')
export class WebhooksController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('saas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive SaaS Stripe webhook events' })
  @ApiHeader({ name: 'stripe-signature', description: 'Stripe webhook signature header.' })
  @ApiResponse({ status: 200, description: 'Webhook received.' })
  handleSaaS(@Body() body: Buffer, @Headers('stripe-signature') signature: string) {
    return this.stripeService.handleSaaSWebhook(body, signature);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Stripe Connect webhook events' })
  @ApiHeader({ name: 'stripe-signature', description: 'Stripe Connect webhook signature header.' })
  @ApiResponse({ status: 200, description: 'Webhook received.' })
  handleConnect(@Body() body: Buffer, @Headers('stripe-signature') signature: string) {
    return this.stripeService.handleConnectWebhook(body, signature);
  }
}
