import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateMembershipTierDto,
  UpdateMembershipTierDto,
} from './dto/membership-tier.dto';
import { FilterMembersDto } from './dto/filter-members.dto';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';

const TIER_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  description: true,
  monthlyPriceCents: true,
  annualPriceCents: true,
  isFree: true,
  isPublic: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { subscriptions: { where: { status: 'ACTIVE' as const } } } },
};

@Injectable()
export class MembershipTiersService {
  private readonly logger = new Logger(MembershipTiersService.name);

  constructor(private readonly db: DatabaseService) {}

  private async assertTier(tenantId: string, tierId: string) {
    const tier = await this.db.membershipTier.findUnique({
      where: { id: tierId },
      select: { id: true, tenantId: true },
    });
    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException(`Membership tier ${tierId} not found`);
    }
    return tier;
  }

  async findAll(tenantId: string) {
    return this.db.membershipTier.findMany({
      where: { tenantId },
      select: TIER_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(tenantId: string, tierId: string) {
    const tier = await this.db.membershipTier.findUnique({
      where: { id: tierId },
      select: TIER_SELECT,
    });
    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException(`Membership tier ${tierId} not found`);
    }
    return tier;
  }

  async create(tenantId: string, dto: CreateMembershipTierDto) {
    const slug =
      dto.slug ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const existing = await this.db.membershipTier.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`A membership tier with slug "${slug}" already exists`);
    }

    const tier = await this.db.membershipTier.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        monthlyPriceCents: dto.monthlyPriceCents ?? 0,
        annualPriceCents: dto.annualPriceCents ?? 0,
        isFree: dto.isFree ?? false,
        isPublic: dto.isPublic ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: TIER_SELECT,
    });

    this.logger.log(`Membership tier created: ${tier.id} ("${tier.name}") in tenant ${tenantId}`);
    return tier;
  }

  async update(tenantId: string, tierId: string, dto: UpdateMembershipTierDto) {
    await this.assertTier(tenantId, tierId);

    if (dto.slug) {
      const conflict = await this.db.membershipTier.findUnique({
        where: { tenantId_slug: { tenantId, slug: dto.slug } },
        select: { id: true },
      });
      if (conflict && conflict.id !== tierId) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken by another tier`);
      }
    }

    return this.db.membershipTier.update({
      where: { id: tierId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.monthlyPriceCents !== undefined ? { monthlyPriceCents: dto.monthlyPriceCents } : {}),
        ...(dto.annualPriceCents !== undefined ? { annualPriceCents: dto.annualPriceCents } : {}),
        ...(dto.isFree !== undefined ? { isFree: dto.isFree } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      select: TIER_SELECT,
    });
  }

  async delete(tenantId: string, tierId: string) {
    await this.assertTier(tenantId, tierId);

    // Check there are no active subscriptions before deleting
    const activeCount = await this.db.membershipSubscription.count({
      where: { tierId, status: 'ACTIVE' },
    });
    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot delete tier: ${activeCount} active subscription(s) exist. Move members to another tier first.`,
      );
    }

    await this.db.membershipTier.delete({ where: { id: tierId } });
    this.logger.log(`Membership tier deleted: ${tierId} in tenant ${tenantId}`);
  }

  async getMembers(tenantId: string, tierId: string, pagination: FilterMembersDto) {
    await this.assertTier(tenantId, tierId);

    const { skip, take } = pagination;

    const where = {
      tenantId,
      membershipSubscriptions: { some: { tierId, status: 'ACTIVE' as const } },
    };

    const [members, total] = await Promise.all([
      this.db.member.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          status: true,
          joinedAt: true,
          membershipSubscriptions: {
            where: { tierId, status: 'ACTIVE' },
            select: { id: true, status: true, endsAt: true, renewsAt: true },
            take: 1,
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take,
      }),
      this.db.member.count({ where }),
    ]);

    return {
      data: members,
      meta: new PaginationMetaDto(total, pagination.page, pagination.limit),
    };
  }
}
