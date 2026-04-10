import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWebhookSubscriptionDto, UpdateWebhookSubscriptionDto, WebhookSubscriptionResponseDto } from './dto/webhook-subscription.dto';
import { WebhookEventType, WebhookPayload } from './webhook-events';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WebhookSubscriptionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  /**
   * Create a new webhook subscription
   */
  async createSubscription(
    tenantId: string,
    dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    // Generate secret if not provided
    const secret = dto.secret || this.generateSecret();

    // Validate events
    this.validateEvents(dto.events);

    // Create subscription
    const subscription = await this.db.webhookSubscription.create({
      data: {
        tenantId,
        url: dto.url,
        events: dto.events,
        secret,
        isActive: true,
        description: dto.description,
      },
    });

    return this.toResponseDto(subscription);
  }

  /**
   * List all webhook subscriptions for a tenant
   */
  async listSubscriptions(tenantId: string): Promise<WebhookSubscriptionResponseDto[]> {
    const subscriptions = await this.db.webhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(sub => this.toResponseDto(sub));
  }

  /**
   * Get a single webhook subscription
   */
  async getSubscription(
    tenantId: string,
    subscriptionId: string,
  ): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.db.webhookSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return this.toResponseDto(subscription);
  }

  /**
   * Update a webhook subscription
   */
  async updateSubscription(
    tenantId: string,
    subscriptionId: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.db.webhookSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    // Validate events if provided
    if (dto.events) {
      this.validateEvents(dto.events);
    }

    // Generate new secret if provided
    const secret = dto.secret ? dto.secret : subscription.secret;

    const updated = await this.db.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.events && { events: dto.events }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.secret && { secret }),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Delete a webhook subscription
   */
  async deleteSubscription(tenantId: string, subscriptionId: string): Promise<void> {
    const subscription = await this.db.webhookSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    await this.db.webhookSubscription.delete({
      where: { id: subscriptionId },
    });
  }

  /**
   * Test a webhook subscription by sending a test payload
   */
  async testSubscription(
    tenantId: string,
    subscriptionId: string,
    eventType?: WebhookEventType,
  ): Promise<{ success: boolean; message: string }> {
    const subscription = await this.db.webhookSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    // Use provided event type or default to member.created
    const testEventType = eventType || WebhookEventType.MEMBER_CREATED;

    // Create test payload
    const payload: WebhookPayload = {
      id: this.generateId(),
      event: testEventType,
      data: {
        test: true,
        message: 'This is a test webhook payload',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      tenantId,
    };

    try {
      await this.deliveryService.deliverWebhook(subscription.id, testEventType, payload);
      return {
        success: true,
        message: 'Test webhook sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test webhook: ${error.message}`,
      };
    }
  }

  /**
   * Toggle webhook subscription active status
   */
  async toggleSubscription(
    tenantId: string,
    subscriptionId: string,
  ): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.db.webhookSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    const updated = await this.db.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: !subscription.isActive },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get active subscriptions for a specific event
   */
  async getActiveSubscriptionsForEvent(
    tenantId: string,
    eventType: WebhookEventType,
  ): Promise<Array<{ id: string; url: string; secret: string }>> {
    const subscriptions = await this.db.webhookSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        events: {
          has: eventType,
        },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });

    return subscriptions;
  }

  /**
   * Update last triggered timestamp
   */
  async updateLastTriggered(subscriptionId: string): Promise<void> {
    await this.db.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { lastTriggeredAt: new Date() },
    });
  }

  /**
   * Validate webhook events
   */
  private validateEvents(events: string[]): void {
    const validEvents = Object.values(WebhookEventType);
    const invalidEvents = events.filter(event => !validEvents.includes(event as WebhookEventType));

    if (invalidEvents.length > 0) {
      throw new BadRequestException(
        `Invalid webhook events: ${invalidEvents.join(', ')}`,
      );
    }
  }

  /**
   * Generate a random webhook secret
   */
  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Convert Prisma model to response DTO
   */
  private toResponseDto(subscription: any): WebhookSubscriptionResponseDto {
    return {
      id: subscription.id,
      url: subscription.url,
      events: subscription.events,
      secret: subscription.secret,
      isActive: subscription.isActive,
      description: subscription.description,
      lastTriggeredAt: subscription.lastTriggeredAt?.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
