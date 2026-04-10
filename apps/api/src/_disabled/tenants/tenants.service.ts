import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { RequestUser } from '../../common/types/request.types';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { UpdateBrandingDto } from './dto/update-branding.dto';
import type { UpdatePortalSettingsDto } from './dto/update-portal-settings.dto';
import type { UpsertCustomFieldDto } from './dto/upsert-custom-field.dto';
import type { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import type { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import type { ReorderCustomFieldsDto } from './dto/reorder-custom-fields.dto';

// ─── Shared select shapes ─────────────────────────────────────────────────────

const TENANT_SETTINGS_SELECT = {
  id: true,
  slug: true,
  name: true,
  domain: true,
  logoUrl: true,
  primaryColor: true,
  countryCode: true,
  timezone: true,
  isActive: true,
  settings: true,
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Super-admin ────────────────────────────────────────────────────────────

  async findAll(_pagination: PaginationDto) {
    return this.db.tenant.findMany({
      select: TENANT_SETTINGS_SELECT,
      take: 50,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { id },
      select: TENANT_SETTINGS_SELECT,
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: Record<string, unknown>, _user: RequestUser) {
    return this.db.tenant.update({ where: { id }, data });
  }

  async remove(id: string, _user: RequestUser) {
    await this.db.tenant.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Full settings read ─────────────────────────────────────────────────────

  async getFullSettings(tenantId: string) {
    const cacheKey = `tenant-settings:${tenantId}`;
    const cached = await this.cacheService.get<unknown>(cacheKey);
    if (cached) return cached;

    const [tenant, subscription] = await Promise.all([
      this.db.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { ...TENANT_SETTINGS_SELECT, settings: true },
      }),
      this.db.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
    ]);

    const payload = { ...tenant, subscription };
    await this.cacheService.set(cacheKey, payload, 3600);
    return payload;
  }

  // ─── Organisation profile ────────────────────────────────────────────────────

  async updateOrganizationProfile(tenantId: string, dto: UpdateOrganizationDto) {
    if (dto.slug) {
      const clash = await this.db.tenant.findFirst({
        where: { slug: dto.slug, NOT: { id: tenantId } },
        select: { id: true },
      });
      if (clash) throw new ConflictException('Slug is already in use by another organisation');
    }

    const {
      supportEmail, supportPhone, websiteUrl,
      facebookUrl, twitterUrl, linkedinUrl, instagramUrl,
      ...tenantFields
    } = dto;

    const settingsData = {
      supportEmail,
      supportPhone,
      websiteUrl,
      facebookUrl,
      twitterUrl,
      linkedinUrl,
      instagramUrl,
    };

    const [tenant] = await this.db.$transaction([
      this.db.tenant.update({
        where: { id: tenantId },
        data: {
          ...(tenantFields.name && { name: tenantFields.name }),
          ...(tenantFields.slug && { slug: tenantFields.slug }),
          ...(tenantFields.timezone && { timezone: tenantFields.timezone }),
          ...(tenantFields.countryCode && { countryCode: tenantFields.countryCode }),
        },
        select: TENANT_SETTINGS_SELECT,
      }),
      this.db.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, ...settingsData },
        update: settingsData,
      }),
    ]);

    await this.cacheService.del(`tenant-settings:${tenantId}`);
    return tenant;
  }

  // ─── Branding ───────────────────────────────────────────────────────────────

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    const { domain, primaryColor, ...settingsFields } = dto;

    await this.db.$transaction([
      ...(domain !== undefined
        ? [this.db.tenant.update({
            where: { id: tenantId },
            data: { domain: domain || null, primaryColor: primaryColor ?? undefined },
          })]
        : primaryColor !== undefined
          ? [this.db.tenant.update({ where: { id: tenantId }, data: { primaryColor } })]
          : []
      ),
      this.db.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, primaryColor, ...settingsFields },
        update: { primaryColor, ...settingsFields },
      }),
    ]);

    await this.cacheService.del(`tenant-settings:${tenantId}`);
    return this.getFullSettings(tenantId);
  }

  // ─── Portal settings ─────────────────────────────────────────────────────────

  async updatePortalSettings(tenantId: string, dto: UpdatePortalSettingsDto) {
    await this.db.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
    await this.cacheService.del(`tenant-settings:${tenantId}`);
    return this.getFullSettings(tenantId);
  }

  // ─── Custom fields ────────────────────────────────────────────────────────────

  async getCustomFields(tenantId: string) {
    return this.db.memberCustomField.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCustomField(tenantId: string, dto: UpsertCustomFieldDto) {
    const slug = dto.name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    const slugSuffix = Date.now().toString(36);
    const uniqueSlug = `${slug}_${slugSuffix}`;

    const maxOrder = await this.db.memberCustomField.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });

    return this.db.memberCustomField.create({
      data: {
        tenantId,
        name: dto.name,
        slug: uniqueSlug,
        fieldType: dto.fieldType,
        isRequired: dto.isRequired ?? false,
        isPublic: dto.isPublic ?? false,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        options: dto.options ?? [],
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateCustomField(tenantId: string, fieldId: string, dto: UpsertCustomFieldDto) {
    const field = await this.db.memberCustomField.findFirst({
      where: { id: fieldId, tenantId },
    });
    if (!field) throw new NotFoundException('Custom field not found');

    return this.db.memberCustomField.update({
      where: { id: fieldId },
      data: {
        name: dto.name,
        fieldType: dto.fieldType,
        isRequired: dto.isRequired ?? field.isRequired,
        isPublic: dto.isPublic ?? field.isPublic,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        options: dto.options ?? [],
      },
    });
  }

  async deleteCustomField(tenantId: string, fieldId: string) {
    const field = await this.db.memberCustomField.findFirst({
      where: { id: fieldId, tenantId },
    });
    if (!field) throw new NotFoundException('Custom field not found');
    await this.db.memberCustomField.delete({ where: { id: fieldId } });
  }

  async reorderCustomFields(tenantId: string, dto: ReorderCustomFieldsDto) {
    await this.db.$transaction(
      dto.ids.map((id, index) =>
        this.db.memberCustomField.updateMany({
          where: { id, tenantId },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.getCustomFields(tenantId);
  }

  // ─── Team members ─────────────────────────────────────────────────────────────

  async getTeamMembers(tenantId: string) {
    return this.db.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async inviteTeamMember(tenantId: string, dto: InviteTeamMemberDto) {
    const existing = await this.db.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) throw new ConflictException('A user with this email already exists in your organisation');

    return this.db.user.create({
      data: {
        tenantId,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        isActive: false, // pending acceptance
      },
      select: {
        id: true, email: true, fullName: true,
        avatarUrl: true, role: true, isActive: true,
        lastLoginAt: true, createdAt: true,
      },
    });
  }

  async updateTeamMember(
    tenantId: string,
    userId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const user = await this.db.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRoleType.OWNER) {
      throw new ForbiddenException('Cannot modify the owner account');
    }

    return this.db.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, fullName: true,
        avatarUrl: true, role: true, isActive: true,
        lastLoginAt: true, createdAt: true,
      },
    });
  }

  async removeTeamMember(tenantId: string, userId: string) {
    const user = await this.db.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRoleType.OWNER) throw new ForbiddenException('Cannot remove the owner');
    await this.db.user.delete({ where: { id: userId } });
  }

  // ─── Usage stats ──────────────────────────────────────────────────────────────

  async getUsageStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      memberCount,
      userCount,
      eventsThisMonth,
      clubCount,
      subscription,
    ] = await Promise.all([
      this.db.member.count({ where: { tenantId } }),
      this.db.user.count({ where: { tenantId, isActive: true } }),
      this.db.event.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      this.db.club.count({ where: { tenantId } }),
      this.db.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
    ]);

    const plan = subscription?.plan;

    const membersLimit = plan?.maxMembers ?? 100;
    const usersLimit = plan?.maxUsers ?? 5;
    const eventsLimit = plan?.maxEvents ?? 10;
    const clubsLimit = plan?.maxClubs ?? 5;

    return {
      members: { label: 'Members', used: memberCount, limit: membersLimit },
      users: { label: 'Admin Users', used: userCount, limit: usersLimit },
      events: { label: 'Events (this month)', used: eventsThisMonth, limit: eventsLimit },
      clubs: { label: 'Clubs', used: clubCount, limit: clubsLimit },
      stats: [
        { label: 'Members', used: memberCount, limit: membersLimit },
        { label: 'Admin Users', used: userCount, limit: usersLimit },
        { label: 'Events (this month)', used: eventsThisMonth, limit: eventsLimit },
        { label: 'Clubs', used: clubCount, limit: clubsLimit },
      ],
      plan: plan
        ? {
            slug: plan.slug,
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            annualPriceCents: plan.annualPriceCents,
            hasCustomDomain: plan.hasCustomDomain,
            hasApiAccess: plan.hasApiAccess,
            hasAdvancedReports: plan.hasAdvancedReports,
          }
        : null,
      subscription: subscription
        ? {
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            currentPeriodEnd: subscription.currentPeriodEnd,
            trialEnd: subscription.trialEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  // ─── Slug availability ────────────────────────────────────────────────────────

  async validateSlug(slug: string, tenantId: string) {
    const clash = await this.db.tenant.findFirst({
      where: { slug, NOT: { id: tenantId } },
      select: { id: true },
    });
    return { available: !clash };
  }

  // ─── Billing history ──────────────────────────────────────────────────────────

  async getBillingHistory(tenantId: string) {
    return this.db.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        id: true, invoiceNumber: true, status: true,
        subtotalCents: true, taxCents: true,
        dueDate: true, paidAt: true, createdAt: true,
      },
    });
  }

  // ─── Free trial system ───────────────────────────────────────────────────────

  async startFreeTrial(tenantId: string) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    // Get Growth plan for trial
    const growthPlan = await this.db.plan.findUnique({
      where: { slug: 'GROWTH' },
    });

    if (!growthPlan) {
      throw new Error('Growth plan not found');
    }

    // Create or update subscription with trial
    const subscription = await this.db.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId: growthPlan.id,
        status: 'TRIALING',
        billingInterval: 'MONTHLY',
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
      update: {
        status: 'TRIALING',
        planId: growthPlan.id,
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });

    // Clear cache
    await this.cacheService.del(`tenant-settings:${tenantId}`);

    return subscription;
  }

  async isTrialExpired(tenantId: string): Promise<boolean> {
    const subscription = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
      select: { trialEnd: true, status: true },
    });

    if (!subscription) return true;
    if (subscription.status !== 'TRIALING') return true;
    if (!subscription.trialEnd) return true;

    return new Date(subscription.trialEnd) < new Date();
  }

  async getTrialDaysRemaining(tenantId: string): Promise<number> {
    const subscription = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
      select: { trialEnd: true, status: true },
    });

    if (!subscription || subscription.status !== 'TRIALING' || !subscription.trialEnd) {
      return 0;
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  async endTrial(tenantId: string) {
    const subscription = await this.db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'TRIALING') {
      throw new ConflictException('Subscription is not in trial status');
    }

    // Update subscription to active (will need payment method)
    const updated = await this.db.tenantSubscription.update({
      where: { tenantId },
      data: {
        status: 'PAST_DUE',
        trialEnd: new Date(),
      },
    });

    await this.cacheService.del(`tenant-settings:${tenantId}`);

    return updated;
  }
}

