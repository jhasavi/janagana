import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, JobsOptions } from 'bullmq';
import { RedisOptions } from 'ioredis';

export const EMAIL_QUEUE_NAME = 'email-queue';
export const EMAIL_DEAD_LETTER_QUEUE_NAME = 'email-dead-letter';

export interface SendEmailJobData {
  jobId: string;
  logId: string;
  tenantId: string;
  campaignId?: string;
  memberId?: string;
  toEmail: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface EmailCampaignBatchJobData {
  jobId: string;
  campaignId: string;
  tenantId: string;
  items: Array<{
    logId: string;
    memberId?: string;
    toEmail: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }>;
}

export interface ScheduleCampaignJobData {
  jobId: string;
  campaignId: string;
  tenantId: string;
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
export class EmailQueueService implements OnModuleDestroy {
  private readonly queue: Queue<SendEmailJobData | EmailCampaignBatchJobData | ScheduleCampaignJobData>;

  constructor(private readonly configService: ConfigService) {
    const connection = getConnection(configService);
    this.queue = new Queue<SendEmailJobData | EmailCampaignBatchJobData | ScheduleCampaignJobData>(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async enqueueEmail(data: SendEmailJobData) {
    return this.queue.add(data.jobId, data, { jobId: data.jobId });
  }

  async enqueueCampaignBatch(data: EmailCampaignBatchJobData, delayMs = 0) {
    const options: JobsOptions = { jobId: data.jobId, delay: Math.max(0, delayMs) };
    return this.queue.add(data.jobId, data, options);
  }

  async enqueueScheduledCampaign(data: ScheduleCampaignJobData, delayMs: number) {
    const options: JobsOptions = { jobId: data.jobId, delay: Math.max(0, delayMs) };
    return this.queue.add(data.jobId, data, options);
  }

  async cancelScheduledJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
