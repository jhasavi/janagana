import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  TestWebhookDto,
  WebhookSubscriptionResponseDto,
} from './dto/webhook-subscription.dto';
import { WebhookDeliveryLogResponseDto, ListDeliveryLogsDto } from './dto/webhook-delivery.dto';
import { Permissions } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PERMISSIONS } from '@orgflow/types';
import { WebhookEventType } from './webhook-events';

@ApiTags('Webhooks')
@ApiBearerAuth('Clerk JWT')
@Controller('webhooks')
@UseGuards(RolesGuard)
export class WebhooksController {
  constructor(
    private readonly subscriptionService: WebhookSubscriptionService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  @Post('subscriptions')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @ApiOperation({
    summary: 'Create a webhook subscription',
    description: 'Register a new webhook URL to receive events for your tenant',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook subscription created successfully',
    type: WebhookSubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createSubscription(
    @Body() dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    // In a real implementation, tenantId would come from the request context
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.createSubscription(tenantId, dto);
  }

  @Get('subscriptions')
  @Permissions(PERMISSIONS.SETTINGS.VIEW)
  @ApiOperation({
    summary: 'List webhook subscriptions',
    description: 'Get all webhook subscriptions for your tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of webhook subscriptions',
    type: [WebhookSubscriptionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async listSubscriptions(): Promise<WebhookSubscriptionResponseDto[]> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.listSubscriptions(tenantId);
  }

  @Get('subscriptions/:id')
  @Permissions(PERMISSIONS.SETTINGS.VIEW)
  @ApiOperation({
    summary: 'Get webhook subscription details',
    description: 'Get detailed information about a specific webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Webhook subscription details',
    type: WebhookSubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook subscription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getSubscription(
    @Param('id') id: string,
  ): Promise<WebhookSubscriptionResponseDto> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.getSubscription(tenantId, id);
  }

  @Put('subscriptions/:id')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @ApiOperation({
    summary: 'Update webhook subscription',
    description: 'Update an existing webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Webhook subscription updated successfully',
    type: WebhookSubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook subscription not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.updateSubscription(tenantId, id, dto);
  }

  @Delete('subscriptions/:id')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete webhook subscription',
    description: 'Delete a webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'Webhook subscription deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook subscription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async deleteSubscription(@Param('id') id: string): Promise<void> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.deleteSubscription(tenantId, id);
  }

  @Post('subscriptions/:id/test')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @ApiOperation({
    summary: 'Test webhook subscription',
    description: 'Send a test webhook payload to verify the endpoint is working',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Webhook subscription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async testSubscription(
    @Param('id') id: string,
    @Body() dto?: TestWebhookDto,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.testSubscription(tenantId, id, dto?.eventType);
  }

  @Post('subscriptions/:id/toggle')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @ApiOperation({
    summary: 'Toggle webhook subscription',
    description: 'Enable or disable a webhook subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Webhook subscription toggled successfully',
    type: WebhookSubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook subscription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async toggleSubscription(
    @Param('id') id: string,
  ): Promise<WebhookSubscriptionResponseDto> {
    const tenantId = 'default-tenant-id';
    return this.subscriptionService.toggleSubscription(tenantId, id);
  }

  @Get('delivery-logs')
  @Permissions(PERMISSIONS.SETTINGS.VIEW)
  @ApiOperation({
    summary: 'List webhook delivery logs',
    description: 'Get delivery logs for webhooks, with optional filtering',
  })
  @ApiQuery({ name: 'subscriptionId', required: false, description: 'Filter by subscription ID' })
  @ApiQuery({ name: 'eventType', required: false, enum: WebhookEventType, description: 'Filter by event type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by delivery status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'List of delivery logs',
    schema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { $ref: '#/components/schemas/WebhookDeliveryLogResponseDto' } },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getDeliveryLogs(
    @Query('subscriptionId') subscriptionId?: string,
    @Query('eventType') eventType?: WebhookEventType,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{ logs: WebhookDeliveryLogResponseDto[]; total: number }> {
    const tenantId = 'default-tenant-id';
    return this.deliveryService.getDeliveryLogs(
      tenantId,
      subscriptionId,
      eventType,
      status,
      page,
      limit,
    );
  }

  @Get('delivery-logs/stats')
  @Permissions(PERMISSIONS.SETTINGS.VIEW)
  @ApiOperation({
    summary: 'Get webhook delivery statistics',
    description: 'Get aggregated statistics about webhook deliveries',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        succeeded: { type: 'number' },
        failed: { type: 'number' },
        pending: { type: 'number' },
        retrying: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getDeliveryStats(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    pending: number;
    retrying: number;
  }> {
    const tenantId = 'default-tenant-id';
    return this.deliveryService.getDeliveryStats(tenantId);
  }

  @Post('delivery-logs/retry')
  @Permissions(PERMISSIONS.SETTINGS.EDIT)
  @ApiOperation({
    summary: 'Retry failed webhooks',
    description: 'Retry all failed webhook deliveries that have not exceeded max retries',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of webhooks retried',
    schema: {
      type: 'object',
      properties: {
        retried: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async retryFailedWebhooks(): Promise<{ retried: number }> {
    const tenantId = 'default-tenant-id';
    const retried = await this.deliveryService.retryFailedWebhooks(tenantId);
    return { retried };
  }

  @Get('events')
  @ApiOperation({
    summary: 'List available webhook events',
    description: 'Get all available webhook event types that can be subscribed to',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available webhook events',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(WebhookEventType),
          },
        },
        categories: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listEvents(): Promise<{
    events: WebhookEventType[];
    categories: Record<string, WebhookEventType[]>;
  }> {
    const { WEBHOOK_EVENT_CATEGORIES, ALL_WEBHOOK_EVENTS } = await import('./webhook-events');
    return {
      events: ALL_WEBHOOK_EVENTS,
      categories: WEBHOOK_EVENT_CATEGORIES,
    };
  }
}
