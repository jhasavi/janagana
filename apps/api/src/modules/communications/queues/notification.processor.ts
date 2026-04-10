import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { NOTIFICATION_QUEUE_NAME, NOTIFICATION_DEAD_LETTER_QUEUE_NAME, CreateNotificationJobData } from './notification.queue';
import { NotificationsService } from '../notifications/notifications.service';

function getConnection(configService: ConfigService): any {
  const url = configService.get<string>('redis.url');
  return url ? { url } : {
    host: configService.get<string>('redis.host') ?? 'localhost',
    port: configService.get<number>('redis.port') ?? 6379,
    password: configService.get<string>('redis.password') ?? undefined,
  };
}

@Injectable()
export class NotificationProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessorService.name);
  private worker?: Worker;
  private deadLetterQueue?: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    const connection = getConnection(this.configService);
    this.deadLetterQueue = new Queue(NOTIFICATION_DEAD_LETTER_QUEUE_NAME, { connection });

    this.worker = new Worker(NOTIFICATION_QUEUE_NAME, async (job: Job<CreateNotificationJobData>) => {
      const data = job.data;
      await this.notificationsService.create(data.tenantId, data.memberId, data.type, data.title, data.body, data.actionUrl);
    }, { connection });

    this.worker.on('failed', async (job, err) => {
      if (!job) return;
      if (job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
        await this.deadLetterQueue?.add(`dead-${job.id}`, {
          jobId: String(job.id),
          failedAt: new Date().toISOString(),
          data: job.data,
          reason: err?.message ?? 'Unknown error',
        });
      }
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.deadLetterQueue?.close();
  }
}
