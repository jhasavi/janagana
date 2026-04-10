import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WebhookEventType, WebhookPayload } from './webhook-events';
import { createHmac } from 'crypto';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff in ms

  constructor(private readonly db: DatabaseService) {}

  /**
   * Deliver a webhook to all subscribed URLs for an event
   */
  async deliverWebhook(
    subscriptionId: string,
    eventType: WebhookEventType,
    payload: WebhookPayload,
  ): Promise<void> {
    const subscription = await this.db.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || !subscription.isActive) {
      this.logger.warn(`Subscription ${subscriptionId} not found or inactive`);
      return;
    }

    // Create delivery log
    const deliveryLog = await this.db.webhookDeliveryLog.create({
      data: {
        subscriptionId,
        eventType,
        payload: payload as any,
        status: 'PENDING',
        attemptNumber: 1,
      },
    });

    // Attempt delivery
    await this.attemptDelivery(subscription, deliveryLog);
  }

  /**
   * Attempt to deliver webhook with retry logic
   */
  private async attemptDelivery(
    subscription: any,
    deliveryLog: any,
  ): Promise<void> {
    const { id, url, secret } = subscription;
    const { id: logId, payload, eventType, attemptNumber } = deliveryLog;

    try {
      // Sign payload
      const signature = this.signPayload(payload, secret);
      const timestamp = Date.now().toString();

      // Send webhook
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': eventType,
        },
        timeout: 10000, // 10 second timeout
      });

      // Update delivery log on success
      await this.db.webhookDeliveryLog.update({
        where: { id: logId },
        data: {
          statusCode: response.status,
          response: response.data ? JSON.stringify(response.data) : 'OK',
          status: 'SUCCEEDED',
          deliveredAt: new Date(),
        },
      });

      // Update subscription last triggered
      await this.db.webhookSubscription.update({
        where: { id },
        data: { lastTriggeredAt: new Date() },
      });

      this.logger.log(`Webhook delivered successfully to ${url}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const errorMessage = axiosError.message;

      // Update delivery log on failure
      await this.db.webhookDeliveryLog.update({
        where: { id: logId },
        data: {
          statusCode,
          response: errorMessage,
          status: 'FAILED',
        },
      });

      // Retry logic
      if (attemptNumber < this.MAX_RETRIES) {
        const retryDelay = this.RETRY_DELAYS[attemptNumber - 1];
        const nextRetryAt = new Date(Date.now() + retryDelay);

        await this.db.webhookDeliveryLog.update({
          where: { id: logId },
          data: {
            status: 'RETRYING',
            nextRetryAt,
          },
        });

        this.logger.warn(
          `Webhook delivery failed (attempt ${attemptNumber}/${this.MAX_RETRIES}), retrying in ${retryDelay}ms`,
        );

        // Schedule retry
        setTimeout(async () => {
          const updatedLog = await this.db.webhookDeliveryLog.findUnique({
            where: { id: logId },
          });

          if (updatedLog && updatedLog.status === 'RETRYING') {
            await this.db.webhookDeliveryLog.update({
              where: { id: logId },
              data: {
                attemptNumber: attemptNumber + 1,
                status: 'PENDING',
              },
            });

            const updatedSubscription = await this.db.webhookSubscription.findUnique({
              where: { id },
            });

            if (updatedSubscription) {
              await this.attemptDelivery(updatedSubscription, updatedLog);
            }
          }
        }, retryDelay);
      } else {
        this.logger.error(
          `Webhook delivery failed after ${this.MAX_RETRIES} attempts to ${url}`,
        );
      }
    }
  }

  /**
   * Sign payload with HMAC-SHA256
   */
  private signPayload(payload: unknown, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    return signature === expectedSignature;
  }

  /**
   * Get delivery logs for a subscription
   */
  async getDeliveryLogs(
    tenantId: string,
    subscriptionId?: string,
    eventType?: WebhookEventType,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ logs: any[]; total: number }> {
    const where: any = {
      subscription: {
        tenantId,
      },
    };

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.db.webhookDeliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: {
            select: {
              url: true,
            },
          },
        },
      }),
      this.db.webhookDeliveryLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        subscriptionId: log.subscriptionId,
        subscriptionUrl: log.subscription.url,
        eventType: log.eventType,
        payload: log.payload,
        statusCode: log.statusCode,
        response: log.response,
        status: log.status,
        attemptNumber: log.attemptNumber,
        nextRetryAt: log.nextRetryAt?.toISOString(),
        deliveredAt: log.deliveredAt?.toISOString(),
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Get delivery statistics for a tenant
   */
  async getDeliveryStats(tenantId: string): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    pending: number;
    retrying: number;
  }> {
    const stats = await this.db.webhookDeliveryLog.groupBy({
      by: ['status'],
      where: {
        subscription: {
          tenantId,
        },
      },
      _count: true,
    });

    const result = {
      total: 0,
      succeeded: 0,
      failed: 0,
      pending: 0,
      retrying: 0,
    };

    for (const stat of stats) {
      result.total += stat._count;
      result[stat.status.toLowerCase()] = stat._count;
    }

    return result;
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks(tenantId: string): Promise<number> {
    const failedLogs = await this.db.webhookDeliveryLog.findMany({
      where: {
        subscription: {
          tenantId,
        },
        status: 'FAILED',
        attemptNumber: { lt: this.MAX_RETRIES },
      },
      include: {
        subscription: true,
      },
      take: 100, // Limit to 100 at a time
    });

    let retried = 0;

    for (const log of failedLogs) {
      if (log.subscription.isActive) {
        await this.db.webhookDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: 'PENDING',
          },
        });

        await this.attemptDelivery(log.subscription, log);
        retried++;
      }
    }

    return retried;
  }
}
