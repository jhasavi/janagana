import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { RedisOptions } from 'ioredis';

export const NOTIFICATION_QUEUE_NAME = 'notification-queue';
export const NOTIFICATION_DEAD_LETTER_QUEUE_NAME = 'notification-dead-letter';

export interface CreateNotificationJobData {
  jobId: string;
  tenantId: string;
  memberId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}

function getConnection(configService: ConfigService): any {
  const url = configService.get<string>('redis.url');
  return url ? { url } : {
    host: configService.get<string>('redis.host') ?? 'localhost',
    port: configService.get<number>('redis.port') ?? 6379,
    password: configService.get<string>('redis.password') ?? undefined,
  };
}

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly queue: Queue<CreateNotificationJobData>;

  constructor(private readonly configService: ConfigService) {
    const connection = getConnection(configService);
    this.queue = new Queue<CreateNotificationJobData>(NOTIFICATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async enqueueNotification(data: CreateNotificationJobData) {
    return this.queue.add(data.jobId, data, { jobId: data.jobId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
