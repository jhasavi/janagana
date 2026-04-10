import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CampaignsService } from '../campaigns/campaigns.service';

interface AnnouncementCreateDto {
  title: string;
  body: string;
  targetAudience: 'ALL' | 'MEMBERS' | 'SPECIFIC_TIERS' | 'CLUBS';
  targetIds?: string[];
  isPinned?: boolean;
  publishedAt?: string;
  expiresAt?: string;
  sendEmail?: boolean;
  sendNotification?: boolean;
}

interface AnnouncementUpdateDto extends Partial<AnnouncementCreateDto> {}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async create(tenantId: string, userId: string, dto: AnnouncementCreateDto) {
    const announcement = await this.db.announcement.create({
      data: {
        tenantId,
        title: dto.title,
        body: dto.body,
        status: dto.publishedAt ? 'PUBLISHED' : 'DRAFT',
        audience: dto.targetAudience,
        targetIds: dto.targetIds?.length ? dto.targetIds : undefined,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPinned: dto.isPinned ?? false,
      },
    });

    if (dto.sendNotification) {
      const members = await this.resolveAudienceMembers(tenantId, dto.targetAudience, dto.targetIds ?? []);
      await this.notificationsService.createBulk(
        tenantId,
        members.map((member) => member.id),
        'announcement',
        dto.title,
        dto.body,
        '/portal',
      );
    }

    if (dto.sendEmail) {
      await this.campaignsService.create(tenantId, userId, {
        name: `Announcement: ${dto.title}`,
        subject: dto.title,
        bodyHtml: dto.body,
        bodyText: dto.body,
        fromName: 'OrgFlow',
        fromEmail: `noreply@${tenantId}.orgflow.app`,
        recipientFilter: { memberStatus: ['active'], ...(dto.targetAudience !== 'ALL' ? { targetAudience: dto.targetAudience, targetIds: dto.targetIds } : {}) },
        scheduledAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      });
    }

    return announcement;
  }

  async findAll(tenantId: string, filters: { status?: string } = {}) {
    return this.db.announcement.findMany({
      where: { tenantId, ...(filters.status ? { status: filters.status as any } : {}) },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, announcementId: string) {
    const announcement = await this.db.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement || announcement.tenantId !== tenantId) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  async update(tenantId: string, announcementId: string, dto: AnnouncementUpdateDto) {
    const existing = await this.db.announcement.findUnique({ where: { id: announcementId } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Announcement not found');
    return this.db.announcement.update({
      where: { id: announcementId },
      data: {
        title: dto.title ?? existing.title,
        body: dto.body ?? existing.body,
        status: dto.publishedAt ? 'PUBLISHED' : existing.status,
        audience: dto.targetAudience ?? existing.audience,
        targetIds: dto.targetIds?.length ? dto.targetIds : existing.targetIds,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : existing.publishedAt,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt,
        isPinned: dto.isPinned ?? existing.isPinned,
        updatedAt: new Date(),
      },
    });
  }

  async delete(tenantId: string, announcementId: string) {
    const existing = await this.db.announcement.findUnique({ where: { id: announcementId } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Announcement not found');
    await this.db.announcement.delete({ where: { id: announcementId } });
    return { deleted: true };
  }

  async pin(tenantId: string, announcementId: string) {
    const announcement = await this.db.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement || announcement.tenantId !== tenantId) throw new NotFoundException('Announcement not found');
    return this.db.announcement.update({ where: { id: announcementId }, data: { isPinned: true } });
  }

  async getForMember(tenantId: string, memberId: string) {
    const member = await this.db.member.findUnique({ where: { id: memberId }, select: { id: true } });
    if (!member) throw new NotFoundException('Member not found');

    const tierIds = await this.db.membershipSubscription.findMany({
      where: { tenantId, memberId, status: 'ACTIVE' },
      select: { tierId: true },
    }).then((rows) => rows.map((row) => row.tierId));

    const clubIds = await this.db.clubMembership.findMany({
      where: { tenantId, memberId },
      select: { clubId: true },
    }).then((rows) => rows.map((row) => row.clubId));

    const announcements = await this.db.announcement.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        expiresAt: { gt: new Date() },
        OR: [
          { audience: 'ALL' as const },
          { audience: 'MEMBERS' as const },
          ...(tierIds.length ? [{ audience: 'SPECIFIC_TIERS' as const, targetIds: { hasSome: tierIds } }] : []),
          ...(clubIds.length ? [{ audience: 'CLUBS' as const, targetIds: { hasSome: clubIds } }] : []),
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });

    return announcements;
  }

  private async resolveAudienceMembers(tenantId: string, audience: string, targetIds: string[]) {
    if (audience === 'ALL' || audience === 'MEMBERS') {
      return this.db.member.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } });
    }

    if (audience === 'SPECIFIC_TIERS') {
      return this.db.membershipSubscription.findMany({
        where: { tenantId, tierId: { in: targetIds }, status: 'ACTIVE' },
        select: { memberId: true },
      }).then((rows) => rows.map((row) => ({ id: row.memberId })));
    }

    if (audience === 'CLUBS') {
      return this.db.clubMembership.findMany({
        where: { tenantId, clubId: { in: targetIds } },
        select: { memberId: true },
      }).then((rows) => rows.map((row) => ({ id: row.memberId })));
    }

    throw new BadRequestException('Invalid announcement audience');
  }
}
