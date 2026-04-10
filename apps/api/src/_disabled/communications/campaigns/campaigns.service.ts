import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { EmailQueueService } from '../queues/email.queue';

interface RecipientFilter {
  memberStatus?: string[];
  tierIds?: string[];
  clubIds?: string[];
  hasVolunteered?: boolean;
  customFieldFilters?: Array<Record<string, unknown>>;
}

interface CreateCampaignDto {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  fromName: string;
  fromEmail: string;
  recipientFilter: RecipientFilter;
  scheduledAt?: string | Date | null;
  templateId?: string | null;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async findAll(tenantId: string) {
    return this.db.emailCampaign.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, campaignId: string) {
    const campaign = await this.db.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.tenantId !== tenantId) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async getTemplates(tenantId: string) {
    return this.db.emailTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async findTemplate(tenantId: string, templateId: string) {
    const template = await this.db.emailTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.tenantId !== tenantId) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(tenantId: string, name: string, subject: string, bodyHtml: string) {
    return this.db.emailTemplate.create({
      data: { tenantId, name, subject, bodyHtml, bodyText: bodyHtml.replace(/<[^>]+>/g, ' ').trim() },
    });
  }

  async updateTemplate(tenantId: string, templateId: string, data: { name?: string; subject?: string; bodyHtml?: string }) {
    const template = await this.findTemplate(tenantId, templateId);
    return this.db.emailTemplate.update({
      where: { id: template.id },
      data: {
        name: data.name ?? template.name,
        subject: data.subject ?? template.subject,
        bodyHtml: data.bodyHtml ?? template.bodyHtml,
        bodyText: data.bodyHtml ? data.bodyHtml.replace(/<[^>]+>/g, ' ').trim() : template.bodyText,
      },
    });
  }

  async deleteTemplate(tenantId: string, templateId: string) {
    const template = await this.findTemplate(tenantId, templateId);
    await this.db.emailTemplate.delete({ where: { id: template.id } });
    return { deleted: true };
  }

  async create(tenantId: string, userId: string, dto: CreateCampaignDto) {
    return this.db.emailCampaign.create({
      data: {
        tenantId,
        templateId: dto.templateId ?? undefined,
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText ?? dto.bodyHtml.replace(/<[^>]+>/g, ' ').trim(),
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        recipientCount: 0,
        recipientFilter: dto.recipientFilter as any,
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async getRecipientPreview(tenantId: string, filter: RecipientFilter) {
    const recipients = await this.resolveRecipients(tenantId, filter, 5);
    const count = await this.db.member.count({ where: this.buildMemberWhere(tenantId, filter) });
    return { count, preview: recipients };
  }

  async sendCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    const recipients = await this.resolveRecipients(tenantId, (campaign.recipientFilter as RecipientFilter) ?? {});
    if (recipients.length === 0) {
      throw new BadRequestException('No members match the campaign recipient filter');
    }

    const logs = await Promise.all(
      recipients.map((member: { id: string; email: string }) =>
        this.db.emailLog.create({
          data: {
            tenantId,
            campaignId: campaign.id,
            memberId: member.id,
            toEmail: member.email,
            subject: campaign.subject,
            status: 'QUEUED',
          },
        }),
      ),
    );

    const batches = this.chunk(logs, 50);
    await Promise.all(
      batches.map((batch, index) =>
        this.emailQueue.enqueueCampaignBatch({
          jobId: `campaign-${campaign.id}-batch-${index}`,
          campaignId: campaign.id,
          tenantId,
          items: batch.map((log: { id: string; memberId?: string | null; toEmail: string; subject: string }) => ({
            logId: log.id,
            memberId: log.memberId ?? undefined,
            toEmail: log.toEmail,
            subject: log.subject,
            html: campaign.bodyHtml,
            text: campaign.bodyText ?? campaign.bodyHtml.replace(/<[^>]+>/g, ' ').trim(),
          })),
        }),
      ),
    );

    await this.db.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT', recipientCount: recipients.length, sentAt: new Date() },
    });

    return { queued: recipients.length };
  }

  async scheduleCampaign(tenantId: string, campaignId: string, scheduledAt: Date) {
    const campaign = await this.findOne(tenantId, campaignId);
    if (campaign.status === 'SENT') throw new BadRequestException('Cannot schedule a campaign that has already been sent');
    await this.db.emailCampaign.update({ where: { id: campaign.id }, data: { status: 'SCHEDULED', scheduledFor: scheduledAt } });
    await this.emailQueue.enqueueScheduledCampaign(
      { jobId: `campaign-schedule-${campaign.id}`, campaignId: campaign.id, tenantId },
      Math.max(0, scheduledAt.getTime() - Date.now()),
    );
    return { scheduled: true };
  }

  async cancelScheduledCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    if (campaign.status !== 'SCHEDULED') throw new BadRequestException('Campaign is not scheduled');
    await this.db.emailCampaign.update({ where: { id: campaign.id }, data: { status: 'DRAFT', scheduledFor: null } });
    await this.emailQueue.cancelScheduledJob(`campaign-schedule-${campaign.id}`);
    return { cancelled: true };
  }

  async duplicateCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    const duplicate = await this.db.emailCampaign.create({
      data: {
        tenantId,
        templateId: campaign.templateId ?? undefined,
        name: `${campaign.name} (Copy)`,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
        bodyText: campaign.bodyText,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        recipientCount: 0,
        recipientFilter: campaign.recipientFilter as any,
        status: 'DRAFT',
      },
    });
    return duplicate;
  }

  async getCampaignStats(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    const logs = await this.db.emailLog.findMany({ where: { campaignId, tenantId } });
    const sent = logs.filter((log) => log.status === 'SENT').length;
    const delivered = logs.filter((log) => log.status === 'DELIVERED').length;
    const opened = logs.filter((log) => log.openedAt).length;
    const clicked = logs.filter((log) => log.clickedAt).length;
    const bounced = logs.filter((log) => log.bouncedAt).length;

    return {
      campaign,
      sent,
      deliveredRate: sent ? delivered / sent : 0,
      openRate: sent ? opened / sent : 0,
      clickRate: sent ? clicked / sent : 0,
      bounced,
    };
  }

  async processScheduledCampaign(tenantId: string, campaignId: string) {
    return this.sendCampaign(tenantId, campaignId);
  }

  private buildMemberWhere(tenantId: string, filter: RecipientFilter) {
    const where: any = { tenantId, status: filter.memberStatus?.includes('active') ? 'ACTIVE' : undefined };
    if (filter.tierIds?.length) {
      where.membershipSubscriptions = { some: { tierId: { in: filter.tierIds }, status: 'ACTIVE' } };
    }
    if (filter.clubIds?.length) {
      where.clubMemberships = { some: { clubId: { in: filter.clubIds } } };
    }
    if (filter.hasVolunteered) {
      where.volunteerApplications = { some: {} };
    }
    return where;
  }

  private async resolveRecipients(tenantId: string, filter: RecipientFilter, limit?: number) {
    return this.db.member.findMany({
      where: this.buildMemberWhere(tenantId, filter),
      select: { id: true, email: true, firstName: true, lastName: true },
      take: limit,
    });
  }

  private chunk<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }
}
