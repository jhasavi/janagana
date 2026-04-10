import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { parse as csvParse } from 'csv-parse/sync';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FilterMembersDto } from './dto/filter-members.dto';
import {
  ImportDuplicateStrategy,
  type ImportSummary,
} from './dto/import-members.dto';
import {
  CreateCustomFieldDto,
  AddNoteDto,
  SendEmailDto,
  RenewMembershipDto,
} from './dto/membership-tier.dto';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';

// ─── Lightweight select shapes for list queries ───────────────────────────────

const MEMBER_LIST_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  joinedAt: true,
  city: true,
  state: true,
  membershipSubscriptions: {
    where: { status: 'ACTIVE' as const },
    take: 1,
    select: {
      id: true,
      status: true,
      endsAt: true,
      renewsAt: true,
      tier: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.MemberSelect;

type MemberListPayload = Prisma.MemberGetPayload<{ select: typeof MEMBER_LIST_SELECT }>;

const MEMBER_DETAIL_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  dateOfBirth: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  countryCode: true,
  bio: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  membershipSubscriptions: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true,
      status: true,
      billingInterval: true,
      startedAt: true,
      endsAt: true,
      renewsAt: true,
      canceledAt: true,
      tier: { select: { id: true, name: true, slug: true } },
    },
  },
  customFieldValues: {
    select: {
      value: true,
      field: { select: { id: true, name: true, slug: true, fieldType: true } },
    },
  },
  _count: {
    select: {
      documents: true,
      notes: true,
      eventRegistrations: true,
      volunteerHours: true,
      clubMemberships: true,
      payments: true,
    },
  },
} satisfies Prisma.MemberSelect;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Helper: assert member belongs to tenant ────────────────────────────────
  private async assertMember(tenantId: string, memberId: string) {
    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: { id: true, tenantId: true },
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    return member;
  }

  // ─── Auto-generate member number (tenantId prefix + padded count) ──────────
  private async generateMemberNumber(tenantId: string): Promise<string> {
    const count = await this.db.member.count({ where: { tenantId } });
    const prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase();
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, filterDto: FilterMembersDto) {
    const {
      search,
      status,
      membershipTierId,
      tierExpiring,
      joinedAfter,
      joinedBefore,
      hasVolunteered,
      clubId,
      skip,
      take,
      sortBy,
      sortOrder,
    } = filterDto;

    const searchKey = JSON.stringify({
      tenantId,
      search,
      status,
      membershipTierId,
      tierExpiring,
      joinedAfter,
      joinedBefore,
      hasVolunteered,
      clubId,
      skip,
      take,
      sortBy,
      sortOrder,
    });
    const cached = await this.cacheService.get<{ data: MemberListPayload[]; meta: PaginationMetaDto }>(
      `member-search:${Buffer.from(searchKey).toString('base64')}`,
    );
    if (cached) return cached;

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.MemberWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(membershipTierId
        ? {
            membershipSubscriptions: {
              some: { tierId: membershipTierId, status: 'ACTIVE' },
            },
          }
        : {}),
      ...(tierExpiring
        ? {
            membershipSubscriptions: {
              some: {
                status: 'ACTIVE',
                endsAt: { gte: now, lte: in30Days },
              },
            },
          }
        : {}),
      ...(joinedAfter ? { joinedAt: { gte: new Date(joinedAfter) } } : {}),
      ...(joinedBefore ? { joinedAt: { lte: new Date(joinedBefore) } } : {}),
      ...(hasVolunteered ? { volunteerHours: { some: {} } } : {}),
      ...(clubId
        ? { clubMemberships: { some: { clubId } } }
        : {}),
    };

    const allowedSortFields: Record<string, Prisma.MemberOrderByWithRelationInput> = {
      firstName: { firstName: sortOrder },
      lastName: { lastName: sortOrder },
      email: { email: sortOrder },
      joinedAt: { joinedAt: sortOrder },
      status: { status: sortOrder },
      createdAt: { createdAt: sortOrder },
    };
    const orderBy: Prisma.MemberOrderByWithRelationInput =
      (sortBy ? allowedSortFields[sortBy] : undefined) ?? { joinedAt: 'desc' };

    const [members, total] = await Promise.all([
      this.db.member.findMany({ where, select: MEMBER_LIST_SELECT, orderBy, skip, take }),
      this.db.member.count({ where }),
    ]);

    const payload = {
      data: members,
      meta: new PaginationMetaDto(total, filterDto.page, filterDto.limit),
    };

    await this.cacheService.set(`member-search:${Buffer.from(searchKey).toString('base64')}`, payload, 60);
    return payload;
  }

  async findOne(tenantId: string, memberId: string) {
    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: MEMBER_DETAIL_SELECT,
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    return member;
  }

  async findByEmail(tenantId: string, email: string) {
    const member = await this.db.member.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: MEMBER_DETAIL_SELECT,
    });
    if (!member) throw new NotFoundException(`No member with email ${email}`);
    return member;
  }

  async getPublicMembershipTiers(tenantSlug: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }
    return this.db.membershipTier.findMany({
      where: { tenantId: tenant.id, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPublicDirectory(
    tenantId: string,
    currentMemberId: string,
    filter: {
      search?: string;
      membershipTierId?: string;
      clubId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const search = filter.search ?? undefined;
    const membershipTierId = filter.membershipTierId ?? undefined;
    const clubId = filter.clubId ?? undefined;
    const take = filter.limit ?? 20;
    const skip = ((filter.page ?? 1) - 1) * take;

    const where: Prisma.MemberWhereInput = {
      tenantId,
      status: MemberStatus.ACTIVE,
      membershipSubscriptions: { some: { status: 'ACTIVE' } },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(membershipTierId
        ? { membershipSubscriptions: { some: { tierId: membershipTierId, status: 'ACTIVE' } } }
        : {}),
      ...(clubId ? { clubMemberships: { some: { clubId } } } : {}),
    };

    const [members, total] = await Promise.all([
      this.db.member.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          bio: true,
          city: true,
          state: true,
          membershipSubscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { tier: { select: { name: true } } },
          },
          clubMemberships: {
            where: { club: { tenantId } },
            take: 5,
            select: { club: { select: { name: true } } },
          },
        },
        orderBy: { firstName: 'asc' },
        skip,
        take,
      }),
      this.db.member.count({ where }),
    ]);

    return {
      data: members.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        avatarUrl: member.avatarUrl,
        bio: member.bio,
        city: member.city,
        state: member.state,
        tier: member.membershipSubscriptions[0]?.tier?.name ?? null,
        clubs: member.clubMemberships.map((membership) => membership.club.name),
        isPublic: true,
      })),
      meta: new PaginationMetaDto(total, filter.page, filter.limit),
    };
  }

  async getPublicMemberProfile(tenantId: string, currentMemberId: string, memberId: string) {
    const member = await this.db.member.findFirst({
      where: { id: memberId, tenantId, status: MemberStatus.ACTIVE },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        city: true,
        state: true,
        countryCode: true,
        membershipSubscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: { tier: { select: { id: true, name: true, slug: true } } },
        },
        clubMemberships: {
          select: { club: { select: { id: true, name: true } } },
        },
        customFieldValues: {
          where: { field: { isPublic: true } },
          select: { value: true, field: { select: { name: true, slug: true } } },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found or not public');
    }

    const currentClubs = await this.db.clubMembership.findMany({
      where: { memberId: currentMemberId, tenantId },
      select: { club: { select: { name: true } } },
    });

    const commonClubNames = member.clubMemberships
      .map((membership) => membership.club.name)
      .filter((clubName) => currentClubs.some((item) => item.club.name === clubName));

    const eventsAttendedCount = await this.db.eventRegistration.count({
      where: { memberId: member.id, status: { not: 'CANCELLED' } },
    });

    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarUrl: member.avatarUrl,
      bio: member.bio,
      location: member.city && member.state ? `${member.city}, ${member.state}` : member.city ?? member.state ?? null,
      tier: member.membershipSubscriptions[0]?.tier?.name ?? null,
      clubsInCommon: commonClubNames,
      clubs: member.clubMemberships.map((membership) => membership.club.name),
      eventsAttendedCount,
      publicFields: member.customFieldValues.map((value) => ({
        label: value.field.name,
        value: value.value,
      })),
    };
  }

  async create(tenantId: string, dto: CreateMemberDto) {
    // Duplicate email check within tenant
    const existing = await this.db.member.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`A member with email ${dto.email} already exists in this organisation`);
    }

    // Validate tier if provided
    if (dto.membershipTierId) {
      const tier = await this.db.membershipTier.findUnique({
        where: { id: dto.membershipTierId },
        select: { id: true, tenantId: true },
      });
      if (!tier || tier.tenantId !== tenantId) {
        throw new BadRequestException('Membership tier not found in this organisation');
      }
    }

    const memberNumber = await this.generateMemberNumber(tenantId);

    const member = await this.db.member.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        address: dto.address?.street,
        city: dto.address?.city,
        state: dto.address?.state,
        postalCode: dto.address?.zip,
        countryCode: dto.address?.country ?? 'US',
        status: MemberStatus.PENDING,
        ...(dto.membershipTierId
          ? {
              membershipSubscriptions: {
                create: {
                  tenantId,
                  tierId: dto.membershipTierId,
                  status: 'ACTIVE',
                  startedAt: new Date(),
                },
              },
            }
          : {}),
      },
      select: MEMBER_DETAIL_SELECT,
    });

    // Persist custom fields if provided
    if (dto.customFields && Object.keys(dto.customFields).length > 0) {
      await this.setCustomFieldValues(tenantId, member.id, dto.customFields);
    }

    // TODO: Enqueue welcome email and magic-link generation via a job queue
    if (dto.sendWelcomeEmail !== false) {
      this.logger.log(`[Queue] Welcome email enqueued for member ${member.id} (${dto.email})`);
    }

    this.logger.log(`Member created: ${member.id} (${memberNumber}) in tenant ${tenantId}`);
    return member;
  }

  async update(tenantId: string, memberId: string, dto: UpdateMemberDto) {
    await this.assertMember(tenantId, memberId);

    if (dto.email) {
      const conflict = await this.db.member.findUnique({
        where: { tenantId_email: { tenantId, email: dto.email } },
        select: { id: true },
      });
      if (conflict && conflict.id !== memberId) {
        throw new ConflictException(`Email ${dto.email} already used by another member`);
      }
    }

    const updated = await this.db.member.update({
      where: { id: memberId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.address?.street !== undefined ? { address: dto.address.street } : {}),
        ...(dto.address?.city !== undefined ? { city: dto.address.city } : {}),
        ...(dto.address?.state !== undefined ? { state: dto.address.state } : {}),
        ...(dto.address?.zip !== undefined ? { postalCode: dto.address.zip } : {}),
        ...(dto.address?.country !== undefined ? { countryCode: dto.address.country } : {}),
      },
      select: MEMBER_DETAIL_SELECT,
    });

    if (dto.customFields) {
      await this.setCustomFieldValues(tenantId, memberId, dto.customFields);
    }

    return updated;
  }

  async updateStatus(tenantId: string, memberId: string, status: MemberStatus) {
    await this.assertMember(tenantId, memberId);
    return this.db.member.update({
      where: { id: memberId },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async delete(tenantId: string, memberId: string) {
    await this.assertMember(tenantId, memberId);
    // Soft-delete: mark inactive and anonymise PII
    await this.db.member.update({
      where: { id: memberId },
      data: {
        status: MemberStatus.INACTIVE,
        email: `deleted-${memberId}@deleted.invalid`,
        phone: null,
        bio: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CSV IMPORT / EXPORT
  // ─────────────────────────────────────────────────────────────────────────────

  async importFromCSV(
    tenantId: string,
    fileBuffer: Buffer,
    duplicateStrategy: ImportDuplicateStrategy = ImportDuplicateStrategy.SKIP,
  ): Promise<ImportSummary> {
    const records = csvParse(fileBuffer, {
      columns: true,
      trim: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];

    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // header is row 1

      const email = (row['email'] ?? '').toLowerCase().trim();
      const firstName = (row['firstName'] ?? row['first_name'] ?? '').trim();
      const lastName = (row['lastName'] ?? row['last_name'] ?? '').trim();

      if (!email || !firstName || !lastName) {
        summary.errors.push({ row: rowNum, email, reason: 'Missing required fields: firstName, lastName, email' });
        continue;
      }

      // Basic email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        summary.errors.push({ row: rowNum, email, reason: 'Invalid email format' });
        continue;
      }

      try {
        const existing = await this.db.member.findUnique({
          where: { tenantId_email: { tenantId, email } },
          select: { id: true },
        });

        if (existing) {
          if (duplicateStrategy === ImportDuplicateStrategy.SKIP) {
            summary.skipped++;
            continue;
          }
          // UPDATE strategy
          await this.db.member.update({
            where: { id: existing.id },
            data: {
              firstName,
              lastName,
              phone: row['phone'] ?? undefined,
            },
          });
          summary.updated++;
        } else {
          await this.db.member.create({
            data: {
              tenantId,
              email,
              firstName,
              lastName,
              phone: row['phone'] ?? undefined,
              status: (row['status'] as MemberStatus | undefined) ?? MemberStatus.PENDING,
            },
          });
          summary.created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        summary.errors.push({ row: rowNum, email, reason: message });
      }
    }

    this.logger.log(
      `CSV import complete for tenant ${tenantId}: +${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors.length} errors`,
    );
    return summary;
  }

  async exportToCSV(tenantId: string, filterDto: FilterMembersDto): Promise<string> {
    // For export we bypass pagination and fetch all matching rows
    const unlimitedFilter = Object.assign(new FilterMembersDto(), filterDto, { page: 1, limit: 10_000 });
    const { data: members } = await this.findAll(tenantId, unlimitedFilter);

    const header = ['id', 'firstName', 'lastName', 'email', 'phone', 'status', 'joinedAt'].join(',');
    const rows = members.map((m) =>
      [
        m.id,
        `"${m.firstName}"`,
        `"${m.lastName}"`,
        m.email,
        m.phone ?? '',
        m.status,
        m.joinedAt.toISOString(),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalMembers,
      activeMembers,
      pendingMembers,
      newThisMonth,
      expiringThisMonth,
      tierBreakdown,
    ] = await Promise.all([
      this.db.member.count({ where: { tenantId } }),
      this.db.member.count({ where: { tenantId, status: MemberStatus.ACTIVE } }),
      this.db.member.count({ where: { tenantId, status: MemberStatus.PENDING } }),
      this.db.member.count({
        where: { tenantId, joinedAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.db.membershipSubscription.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          endsAt: { gte: now, lte: endOfMonth },
        },
      }),
      this.db.membershipTier.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Growth rate: compare with previous month
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const newLastMonth = await this.db.member.count({
      where: { tenantId, joinedAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    });
    const growthRate =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
        : 0;

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      newThisMonth,
      expiringThisMonth,
      growthRate,
      byTier: tierBreakdown.map((t) => ({
        tierId: t.id,
        tierName: t.name,
        activeCount: t._count.subscriptions,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVITY TIMELINE
  // ─────────────────────────────────────────────────────────────────────────────

  async getMemberActivity(tenantId: string, memberId: string) {
    await this.assertMember(tenantId, memberId);

    const [eventRegistrations, volunteerHours, clubMemberships, payments, notes] =
      await Promise.all([
        this.db.eventRegistration.findMany({
          where: { memberId },
          select: {
            id: true,
            status: true,
            registeredAt: true,
            event: { select: { id: true, title: true, startsAt: true } },
          },
          orderBy: { registeredAt: 'desc' },
          take: 20,
        }),
        this.db.volunteerHours.findMany({
          where: { memberId },
          select: {
            id: true,
            hours: true,
            description: true,
            date: true,
            isApproved: true,
          },
          orderBy: { date: 'desc' },
          take: 20,
        }),
        this.db.clubMembership.findMany({
          where: { memberId },
          select: {
            id: true,
            role: true,
            joinedAt: true,
            club: { select: { id: true, name: true } },
          },
          orderBy: { joinedAt: 'desc' },
          take: 20,
        }),
        this.db.payment.findMany({
          where: { memberId },
          select: {
            id: true,
            amountCents: true,
            status: true,
            createdAt: true,
            description: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.db.memberNote.findMany({
          where: { memberId, tenantId },
          select: {
            id: true,
            body: true,
            isPrivate: true,
            createdAt: true,
            author: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    return {
      eventRegistrations,
      volunteerHours,
      clubMemberships,
      payments,
      notes,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────────────────────────────────

  async addNote(tenantId: string, memberId: string, authorEmail: string, dto: AddNoteDto) {
    await this.assertMember(tenantId, memberId);

    // Resolve the DB user ID from their email within the tenant
    const author = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId, email: authorEmail } },
      select: { id: true },
    });
    if (!author) {
      throw new BadRequestException('Author not found in this organisation');
    }

    return this.db.memberNote.create({
      data: {
        tenantId,
        memberId,
        authorId: author.id,
        body: dto.body,
        isPrivate: dto.isPrivate ?? true,
      },
      select: {
        id: true,
        body: true,
        isPrivate: true,
        createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async getNotes(tenantId: string, memberId: string) {
    await this.assertMember(tenantId, memberId);
    return this.db.memberNote.findMany({
      where: { tenantId, memberId },
      select: {
        id: true,
        body: true,
        isPrivate: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  async uploadDocument(
    tenantId: string,
    memberId: string,
    file: Express.Multer.File,
    documentType: string,
  ) {
    await this.assertMember(tenantId, memberId);

    // In production this would upload to S3/Cloudinary and return the URL.
    const fileUrl = `/uploads/members/${memberId}/${Date.now()}-${file.originalname}`;

    return this.db.memberDocument.create({
      data: {
        tenantId,
        memberId,
        name: documentType || file.originalname,
        fileUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    });
  }

  async getDocuments(tenantId: string, memberId: string) {
    await this.assertMember(tenantId, memberId);
    return this.db.memberDocument.findMany({
      where: { tenantId, memberId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BULK EMAIL
  // ─────────────────────────────────────────────────────────────────────────────

  async sendEmail(tenantId: string, memberIds: string[], dto: SendEmailDto) {
    const members = await this.db.member.findMany({
      where: { id: { in: memberIds }, tenantId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (members.length === 0) {
      throw new BadRequestException('No valid members found for the provided IDs');
    }

    // TODO: Enqueue email jobs via a job queue (Bull/BullMQ)
    this.logger.log(
      `[Queue] Bulk email enqueued to ${members.length} members in tenant ${tenantId}: "${dto.subject}"`,
    );

    return { queued: members.length };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEMBERSHIP RENEWAL
  // ─────────────────────────────────────────────────────────────────────────────

  async renewMembership(tenantId: string, memberId: string, dto: RenewMembershipDto) {
    await this.assertMember(tenantId, memberId);

    const tier = await this.db.membershipTier.findUnique({
      where: { id: dto.tierId },
      select: { id: true, tenantId: true, name: true },
    });
    if (!tier || tier.tenantId !== tenantId) {
      throw new BadRequestException('Membership tier not found in this organisation');
    }

    // Cancel any existing active subscription
    await this.db.membershipSubscription.updateMany({
      where: { memberId, tenantId, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    const subscription = await this.db.membershipSubscription.create({
      data: {
        tenantId,
        memberId,
        tierId: dto.tierId,
        status: 'ACTIVE',
        startedAt: now,
        endsAt,
        renewsAt: endsAt,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endsAt: true,
        renewsAt: true,
        tier: { select: { id: true, name: true } },
      },
    });

    // Activate member if they were pending
    await this.db.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.ACTIVE },
    });

    return subscription;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CUSTOM FIELDS
  // ─────────────────────────────────────────────────────────────────────────────

  async getCustomFields(tenantId: string) {
    return this.db.memberCustomField.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCustomField(tenantId: string, dto: CreateCustomFieldDto) {
    const slug =
      dto.slug ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const existing = await this.db.memberCustomField.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`A custom field with slug "${slug}" already exists`);
    }

    return this.db.memberCustomField.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        fieldType: dto.fieldType ?? 'TEXT',
        isRequired: dto.isRequired ?? false,
        isPublic: dto.isPublic ?? false,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        options: dto.options ?? [],
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async setCustomFieldValues(
    tenantId: string,
    memberId: string,
    values: Record<string, unknown>,
  ) {
    const slugs = Object.keys(values);
    const fields = await this.db.memberCustomField.findMany({
      where: { tenantId, slug: { in: slugs } },
      select: { id: true, slug: true },
    });

    const fieldMap = new Map(fields.map((f) => [f.slug, f.id]));

    await Promise.all(
      Object.entries(values).map(([slug, val]) => {
        const fieldId = fieldMap.get(slug);
        if (!fieldId) return Promise.resolve();
        return this.db.memberCustomFieldValue.upsert({
          where: { memberId_fieldId: { memberId, fieldId } },
          create: { memberId, fieldId, value: String(val) },
          update: { value: String(val) },
        });
      }),
    );
  }
}
