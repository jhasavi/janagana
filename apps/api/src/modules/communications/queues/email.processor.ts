import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { EmailQueueService, EMAIL_QUEUE_NAME, EMAIL_DEAD_LETTER_QUEUE_NAME, SendEmailJobData, EmailCampaignBatchJobData, ScheduleCampaignJobData } from './email.queue';
import { EmailService } from '../email/email.service';
import { CampaignsService } from '../campaigns/campaigns.service';

function getConnection(configService: ConfigService): RedisOptions | { url: string } {
  const url = configService.get<string>('redis.url');
  return url ? { url } : {
    host: configService.get<string>('redis.host') ?? 'localhost',
    port: configService.get<number>('redis.port') ?? 6379,
    password: configService.get<string>('redis.password') ?? undefined,
  };
}

@Injectable()
export class EmailProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailProcessorService.name);
  private worker?: Worker;
  private deadLetterQueue?: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async onModuleInit() {
    const connection = getConnection(this.configService);
    this.deadLetterQueue = new Queue(EMAIL_DEAD_LETTER_QUEUE_NAME, { connection });

    this.worker = new Worker(EMAIL_QUEUE_NAME, async (job: Job) => {
      const data = job.data as SendEmailJobData | EmailCampaignBatchJobData | ScheduleCampaignJobData;

      if ('items' in data) {
        await Promise.all(data.items.map((item) =>
          this.emailService.deliverQueuedEmail({
            logId: item.logId,
            tenantId: data.tenantId,
            campaignId: data.campaignId,
            memberId: item.memberId,
            toEmail: item.toEmail,
            subject: item.subject,
            html: item.html,
            text: item.text,
            headers: item.headers,
          }),
        ));
        return;
      }

      if ('toEmail' in data) {
        await this.emailService.deliverQueuedEmail(data);
        return;
      }

      await this.campaignsService.processScheduledCampaign(data.tenantId, data.campaignId);
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
