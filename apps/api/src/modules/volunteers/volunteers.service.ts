import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VolunteerApplicationStatus, VolunteerShiftStatus, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  AddShiftDto,
  UpdateShiftDto,
} from './dto/create-opportunity.dto';
import {
  CreateApplicationDto,
  ReviewApplicationDto,
  BulkReviewApplicationsDto,
} from './dto/create-application.dto';
import {
  LogHoursDto,
  RejectHoursDto,
  FilterOpportunitiesDto,
  FilterApplicationsDto,
  FilterHoursDto,
} from './dto/log-hours.dto';

// ─── Select shapes ────────────────────────────────────────────────────────────

const OPP_LIST_SELECT = {
  id: true,
  tenantId: true,
  title: true,
  slug: true,
  description: true,
  location: true,
  isVirtual: true,
  isActive: true,
  startsAt: true,
  endsAt: true,
  totalHours: true,
  createdAt: true,
  updatedAt: true,
  skills: {
    select: { id: true, name: true, isRequired: true },
    orderBy: { name: 'asc' as const },
  },
  _count: { select: { applications: true, shifts: true } },
} satisfies Prisma.VolunteerOpportunitySelect;

const OPP_DETAIL_SELECT = {
  ...OPP_LIST_SELECT,
  shifts: {
    select: {
      id: true,
      name: true,
      description: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      status: true,
      location: true,
      _count: { select: { signups: true } },
    },
    orderBy: { startsAt: 'asc' as const },
  },
} satisfies Prisma.VolunteerOpportunitySelect;

const APPLICATION_SELECT = {
  id: true,
  tenantId: true,
  opportunityId: true,
  memberId: true,
  status: true,
  coverLetter: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  opportunity: {
    select: { id: true, title: true, slug: true, startsAt: true, endsAt: true },
  },
  member: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
  },
} satisfies Prisma.VolunteerApplicationSelect;

const SHIFT_SELECT = {
  id: true,
  tenantId: true,
  opportunityId: true,
  name: true,
  description: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  status: true,
  location: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { signups: true } },
} satisfies Prisma.VolunteerShiftSelect;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VolunteersService {
  private readonly logger = new Logger(VolunteersService.name);

  constructor(private readonly db: DatabaseService) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private async buildUniqueSlug(tenantId: string, title: string, excludeId?: string): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.db.volunteerOpportunity.findFirst({
        where: {
          tenantId,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) return slug;
      slug = `${base}-${++attempt}`;
    }
  }

  private async assertOpportunity(tenantId: string, opportunityId: string) {
    const opp = await this.db.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, tenantId: true, isActive: true },
    });
    if (!opp || opp.tenantId !== tenantId) {
      throw new NotFoundException(`Volunteer opportunity ${opportunityId} not found`);
    }
    return opp;
  }

  private async assertShift(tenantId: string, shiftId: string) {
    const shift = await this.db.volunteerShift.findUnique({
      where: { id: shiftId },
      select: { id: true, tenantId: true, status: true, capacity: true },
    });
    if (!shift || shift.tenantId !== tenantId) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    return shift;
  }

  private async syncSkills(
    tx: Prisma.TransactionClient,
    tenantId: string,
    opportunityId: string,
    requiredSkills: string[] | undefined,
    preferredSkills: string[] | undefined,
  ): Promise<void> {
    await tx.volunteerSkill.deleteMany({ where: { opportunityId } });

    const skills: { tenantId: string; opportunityId: string; name: string; isRequired: boolean }[] = [];
    for (const name of requiredSkills ?? []) {
      skills.push({ tenantId, opportunityId, name, isRequired: true });
    }
    for (const name of preferredSkills ?? []) {
      skills.push({ tenantId, opportunityId, name, isRequired: false });
    }
    if (skills.length > 0) {
      await tx.volunteerSkill.createMany({ data: skills, skipDuplicates: true });
    }
  }

  // ─── OPPORTUNITIES ─────────────────────────────────────────────────────────

  async findAllOpportunities(tenantId: string, filterDto: FilterOpportunitiesDto) {
    const { page, limit, search, isVirtual, isActive, startDate, endDate, sortBy, sortOrder } = filterDto;

    const where: Prisma.VolunteerOpportunityWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isVirtual !== undefined && { isVirtual }),
      ...(isActive !== undefined && { isActive }),
      ...(startDate && { startsAt: { gte: new Date(startDate) } }),
      ...(endDate && { endsAt: { lte: new Date(endDate) } }),
    };

    const allowedSort: Record<string, Prisma.VolunteerOpportunityOrderByWithRelationInput> = {
      title: { title: sortOrder ?? 'asc' },
      startsAt: { startsAt: sortOrder ?? 'asc' },
      createdAt: { createdAt: sortOrder ?? 'desc' },
    };
    const orderBy = (sortBy ? allowedSort[sortBy] : undefined) ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.db.volunteerOpportunity.count({ where }),
      this.db.volunteerOpportunity.findMany({
        where,
        select: OPP_LIST_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  async findOpportunity(tenantId: string, opportunityId: string) {
    const opp = await this.db.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
      select: OPP_DETAIL_SELECT,
    });
    if (!opp || opp.tenantId !== tenantId) {
      throw new NotFoundException(`Volunteer opportunity ${opportunityId} not found`);
    }
    return opp;
  }

  async createOpportunity(tenantId: string, _userId: string, dto: CreateOpportunityDto) {
    const slug = await this.buildUniqueSlug(tenantId, dto.title);
    const locationStr = dto.location ? JSON.stringify(dto.location) : undefined;

    return this.db.$transaction(async (tx) => {
      const opp = await tx.volunteerOpportunity.create({
        data: {
          tenantId,
          title: dto.title,
          slug,
          description: dto.description ?? null,
          location: locationStr,
          isVirtual: dto.isVirtual ?? false,
          isActive: false,
          startsAt: dto.startDate ? new Date(dto.startDate) : null,
          endsAt: dto.endDate ? new Date(dto.endDate) : null,
          totalHours: dto.hoursPerShift ?? null,
        },
      });

      await this.syncSkills(tx, tenantId, opp.id, dto.requiredSkills, dto.preferredSkills);

      if (dto.shifts?.length) {
        await tx.volunteerShift.createMany({
          data: dto.shifts.map((s) => ({
            tenantId,
            opportunityId: opp.id,
            name: s.shiftName,
            description: s.description ?? null,
            startsAt: new Date(s.startTime),
            endsAt: new Date(s.endTime),
            capacity: s.volunteersNeeded ?? 1,
            status: VolunteerShiftStatus.OPEN,
            location: s.location ? JSON.stringify(s.location) : null,
          })),
        });
      }

      return tx.volunteerOpportunity.findUnique({
        where: { id: opp.id },
        select: OPP_DETAIL_SELECT,
      });
    });
  }

  async updateOpportunity(tenantId: string, opportunityId: string, dto: UpdateOpportunityDto) {
    await this.assertOpportunity(tenantId, opportunityId);

    return this.db.$transaction(async (tx) => {
      const data: Prisma.VolunteerOpportunityUpdateInput = {};

      if (dto.title !== undefined) {
        data.title = dto.title;
        data.slug = await this.buildUniqueSlug(tenantId, dto.title, opportunityId);
      }
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.location !== undefined) data.location = JSON.stringify(dto.location);
      if (dto.isVirtual !== undefined) data.isVirtual = dto.isVirtual;
      if (dto.startDate !== undefined) data.startsAt = new Date(dto.startDate);
      if (dto.endDate !== undefined) data.endsAt = new Date(dto.endDate);
      if (dto.hoursPerShift !== undefined) data.totalHours = dto.hoursPerShift;

      await tx.volunteerOpportunity.update({ where: { id: opportunityId }, data });

      if (dto.requiredSkills !== undefined || dto.preferredSkills !== undefined) {
        await this.syncSkills(tx, tenantId, opportunityId, dto.requiredSkills, dto.preferredSkills);
      }

      return tx.volunteerOpportunity.findUnique({
        where: { id: opportunityId },
        select: OPP_DETAIL_SELECT,
      });
    });
  }

  async deleteOpportunity(tenantId: string, opportunityId: string): Promise<void> {
    await this.assertOpportunity(tenantId, opportunityId);

    const approvedApps = await this.db.volunteerApplication.count({
      where: { tenantId, opportunityId, status: VolunteerApplicationStatus.APPROVED },
    });
    if (approvedApps > 0) {
      throw new BadRequestException(
        'Cannot delete an opportunity with approved applications. Close it first.',
      );
    }

    await this.db.volunteerOpportunity.delete({ where: { id: opportunityId } });
  }

  async publishOpportunity(tenantId: string, opportunityId: string) {
    await this.assertOpportunity(tenantId, opportunityId);
    return this.db.volunteerOpportunity.update({
      where: { id: opportunityId },
      data: { isActive: true },
      select: OPP_LIST_SELECT,
    });
  }

  async closeOpportunity(tenantId: string, opportunityId: string) {
    await this.assertOpportunity(tenantId, opportunityId);
    return this.db.volunteerOpportunity.update({
      where: { id: opportunityId },
      data: { isActive: false },
      select: OPP_LIST_SELECT,
    });
  }

  async duplicateOpportunity(tenantId: string, opportunityId: string) {
    const source = await this.db.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
      select: {
        title: true,
        tenantId: true,
        description: true,
        location: true,
        isVirtual: true,
        startsAt: true,
        endsAt: true,
        totalHours: true,
        skills: { select: { name: true, isRequired: true } },
        shifts: {
          select: { name: true, description: true, startsAt: true, endsAt: true, capacity: true, location: true },
        },
      },
    });
    if (!source || source.tenantId !== tenantId) {
      throw new NotFoundException(`Volunteer opportunity ${opportunityId} not found`);
    }

    const slug = await this.buildUniqueSlug(tenantId, `${source.title} copy`);

    return this.db.$transaction(async (tx) => {
      const copy = await tx.volunteerOpportunity.create({
        data: {
          tenantId,
          title: `${source.title} (Copy)`,
          slug,
          description: source.description,
          location: source.location ?? undefined,
          isVirtual: source.isVirtual,
          isActive: false,
          startsAt: source.startsAt,
          endsAt: source.endsAt,
          totalHours: source.totalHours,
        },
      });

      if (source.skills.length > 0) {
        await tx.volunteerSkill.createMany({
          data: source.skills.map((s) => ({ tenantId, opportunityId: copy.id, name: s.name, isRequired: s.isRequired })),
        });
      }

      if (source.shifts.length > 0) {
        await tx.volunteerShift.createMany({
          data: source.shifts.map((s) => ({
            tenantId,
            opportunityId: copy.id,
            name: s.name,
            description: s.description,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            capacity: s.capacity,
            status: VolunteerShiftStatus.OPEN,
            location: s.location,
          })),
        });
      }

      return tx.volunteerOpportunity.findUnique({
        where: { id: copy.id },
        select: OPP_DETAIL_SELECT,
      });
    });
  }

  async getPublicOpportunities(tenantId: string) {
    return this.db.volunteerOpportunity.findMany({
      where: { tenantId, isActive: true },
      select: OPP_LIST_SELECT,
      orderBy: { startsAt: 'asc' },
    });
  }

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────

  async getApplications(tenantId: string, filterDto: FilterApplicationsDto) {
    const { page, limit, opportunityId, memberId, status, startDate, endDate } = filterDto;

    const where: Prisma.VolunteerApplicationWhereInput = {
      tenantId,
      ...(opportunityId && { opportunityId }),
      ...(memberId && { memberId }),
      ...(status && { status }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.db.volunteerApplication.count({ where }),
      this.db.volunteerApplication.findMany({
        where,
        select: APPLICATION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  async getOpportunityApplications(tenantId: string, opportunityId: string) {
    await this.assertOpportunity(tenantId, opportunityId);
    return this.db.volunteerApplication.findMany({
      where: { tenantId, opportunityId },
      select: APPLICATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitApplication(tenantId: string, dto: CreateApplicationDto) {
    const { opportunityId, memberId } = dto;

    const opp = await this.db.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, tenantId: true, isActive: true },
    });
    if (!opp || opp.tenantId !== tenantId) {
      throw new NotFoundException(`Volunteer opportunity ${opportunityId} not found`);
    }
    if (!opp.isActive) {
      throw new BadRequestException('This opportunity is not currently accepting applications');
    }

    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: { id: true, tenantId: true },
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    const existing = await this.db.volunteerApplication.findUnique({
      where: { opportunityId_memberId: { opportunityId, memberId } },
    });
    if (existing && existing.status !== VolunteerApplicationStatus.WITHDRAWN) {
      throw new ConflictException('Member has already applied for this opportunity');
    }

    // Combine all text fields into coverLetter (schema has one text field)
    const parts: string[] = [];
    if (dto.motivation) parts.push(`Motivation:\n${dto.motivation}`);
    if (dto.experience) parts.push(`Experience:\n${dto.experience}`);
    if (dto.availability) parts.push(`Availability:\n${dto.availability}`);
    if (dto.answers?.length) {
      const answersText = dto.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
      parts.push(`Application Questions:\n${answersText}`);
    }
    if (dto.emergencyContact) {
      parts.push(`Emergency Contact:\n${dto.emergencyContact.name} — ${dto.emergencyContact.phone}`);
    }
    const coverLetter = parts.join('\n\n---\n\n') || null;

    return this.db.$transaction(async (tx) => {
      const application = await tx.volunteerApplication.upsert({
        where: { opportunityId_memberId: { opportunityId, memberId } },
        create: { tenantId, opportunityId, memberId, status: VolunteerApplicationStatus.PENDING, coverLetter },
        update: { status: VolunteerApplicationStatus.PENDING, coverLetter, reviewedAt: null },
      });

      if (dto.shiftIds?.length) {
        for (const shiftId of dto.shiftIds) {
          const shift = await tx.volunteerShift.findUnique({
            where: { id: shiftId },
            select: { id: true, tenantId: true, status: true, capacity: true },
          });
          if (!shift || shift.tenantId !== tenantId) {
            throw new NotFoundException(`Shift ${shiftId} not found`);
          }
          if (shift.status === VolunteerShiftStatus.FULL) {
            throw new BadRequestException(`Shift ${shiftId} is full`);
          }
          if (shift.status === VolunteerShiftStatus.CANCELED) {
            throw new BadRequestException(`Shift ${shiftId} is canceled`);
          }

          await tx.volunteerShiftSignup.upsert({
            where: { shiftId_memberId: { shiftId, memberId } },
            create: { tenantId, shiftId, memberId },
            update: { canceledAt: null },
          });

          const activeCount = await tx.volunteerShiftSignup.count({
            where: { shiftId, canceledAt: null },
          });
          if (shift.capacity && activeCount >= shift.capacity) {
            await tx.volunteerShift.update({
              where: { id: shiftId },
              data: { status: VolunteerShiftStatus.FULL },
            });
          }
        }
      }

      this.logger.log(`Application submitted: member=${memberId} opportunity=${opportunityId}`);

      return tx.volunteerApplication.findUnique({
        where: { id: application.id },
        select: APPLICATION_SELECT,
      });
    });
  }

  async reviewApplication(tenantId: string, applicationId: string, dto: ReviewApplicationDto) {
    const application = await this.db.volunteerApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, tenantId: true, status: true, memberId: true, coverLetter: true },
    });
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    if (application.status === VolunteerApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot review a withdrawn application');
    }

    const coverLetter = dto.notes
      ? `${application.coverLetter ?? ''}\n\n---\nReview Notes:\n${dto.notes}`
      : application.coverLetter;

    const updated = await this.db.volunteerApplication.update({
      where: { id: applicationId },
      data: { status: dto.status, coverLetter, reviewedAt: new Date() },
      select: APPLICATION_SELECT,
    });

    this.logger.log(`Application ${applicationId} → ${dto.status} (member=${application.memberId})`);
    return updated;
  }

  async withdrawApplication(tenantId: string, applicationId: string, memberId: string) {
    const application = await this.db.volunteerApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, tenantId: true, memberId: true, status: true },
    });
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    if (application.memberId !== memberId) {
      throw new BadRequestException('You can only withdraw your own application');
    }
    if (application.status === VolunteerApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Application is already withdrawn');
    }

    return this.db.volunteerApplication.update({
      where: { id: applicationId },
      data: { status: VolunteerApplicationStatus.WITHDRAWN, reviewedAt: new Date() },
      select: APPLICATION_SELECT,
    });
  }

  async bulkReviewApplications(tenantId: string, dto: BulkReviewApplicationsDto) {
    const result = await this.db.volunteerApplication.updateMany({
      where: {
        id: { in: dto.applicationIds },
        tenantId,
        status: { not: VolunteerApplicationStatus.WITHDRAWN },
      },
      data: { status: dto.status, reviewedAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── SHIFTS ────────────────────────────────────────────────────────────────

  async getShifts(tenantId: string, opportunityId: string) {
    await this.assertOpportunity(tenantId, opportunityId);
    return this.db.volunteerShift.findMany({
      where: { tenantId, opportunityId },
      select: SHIFT_SELECT,
      orderBy: { startsAt: 'asc' },
    });
  }

  async addShift(tenantId: string, opportunityId: string, dto: AddShiftDto) {
    await this.assertOpportunity(tenantId, opportunityId);
    return this.db.volunteerShift.create({
      data: {
        tenantId,
        opportunityId,
        name: dto.shiftName,
        description: dto.description ?? null,
        startsAt: new Date(dto.startTime),
        endsAt: new Date(dto.endTime),
        capacity: dto.capacity ?? 1,
        status: VolunteerShiftStatus.OPEN,
        location: dto.location ?? null,
      },
      select: SHIFT_SELECT,
    });
  }

  async updateShift(tenantId: string, shiftId: string, dto: UpdateShiftDto) {
    await this.assertShift(tenantId, shiftId);

    const data: Prisma.VolunteerShiftUpdateInput = {};
    if (dto.shiftName !== undefined) data.name = dto.shiftName;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startTime !== undefined) data.startsAt = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endsAt = new Date(dto.endTime);
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.location !== undefined) data.location = dto.location;

    return this.db.volunteerShift.update({
      where: { id: shiftId },
      data,
      select: SHIFT_SELECT,
    });
  }

  async signUpForShift(tenantId: string, memberId: string, shiftId: string) {
    const shift = await this.db.volunteerShift.findUnique({
      where: { id: shiftId },
      select: { id: true, tenantId: true, status: true, capacity: true },
    });
    if (!shift || shift.tenantId !== tenantId) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    if (shift.status === VolunteerShiftStatus.FULL) {
      throw new BadRequestException('This shift is full');
    }
    if (shift.status === VolunteerShiftStatus.CANCELED) {
      throw new BadRequestException('This shift has been canceled');
    }
    if (shift.status === VolunteerShiftStatus.COMPLETED) {
      throw new BadRequestException('This shift has already completed');
    }

    const existing = await this.db.volunteerShiftSignup.findUnique({
      where: { shiftId_memberId: { shiftId, memberId } },
    });
    if (existing && !existing.canceledAt) {
      throw new ConflictException('Already signed up for this shift');
    }

    return this.db.$transaction(async (tx) => {
      const signup = await tx.volunteerShiftSignup.upsert({
        where: { shiftId_memberId: { shiftId, memberId } },
        create: { tenantId, shiftId, memberId, confirmedAt: new Date() },
        update: { canceledAt: null, confirmedAt: new Date() },
      });

      const activeCount = await tx.volunteerShiftSignup.count({
        where: { shiftId, canceledAt: null },
      });
      if (shift.capacity && activeCount >= shift.capacity) {
        await tx.volunteerShift.update({
          where: { id: shiftId },
          data: { status: VolunteerShiftStatus.FULL },
        });
      }

      return signup;
    });
  }

  async cancelShiftSignup(tenantId: string, memberId: string, shiftId: string) {
    const signup = await this.db.volunteerShiftSignup.findUnique({
      where: { shiftId_memberId: { shiftId, memberId } },
      select: { id: true, tenantId: true, canceledAt: true },
    });
    if (!signup || signup.tenantId !== tenantId) {
      throw new NotFoundException('Shift signup not found');
    }
    if (signup.canceledAt) {
      throw new BadRequestException('Signup is already canceled');
    }

    return this.db.$transaction(async (tx) => {
      await tx.volunteerShiftSignup.update({
        where: { shiftId_memberId: { shiftId, memberId } },
        data: { canceledAt: new Date() },
      });

      await tx.volunteerShift.updateMany({
        where: { id: shiftId, status: VolunteerShiftStatus.FULL },
        data: { status: VolunteerShiftStatus.OPEN },
      });

      return { canceled: true, shiftId, memberId };
    });
  }

  async getShiftRoster(tenantId: string, shiftId: string) {
    const shift = await this.db.volunteerShift.findUnique({
      where: { id: shiftId },
      select: {
        id: true, tenantId: true, name: true, startsAt: true, endsAt: true, capacity: true, status: true,
      },
    });
    if (!shift || shift.tenantId !== tenantId) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }

    const signups = await this.db.volunteerShiftSignup.findMany({
      where: { shiftId, canceledAt: null },
      select: {
        id: true,
        confirmedAt: true,
        createdAt: true,
        member: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { shift, signups, count: signups.length };
  }

  async markShiftComplete(tenantId: string, shiftId: string) {
    await this.assertShift(tenantId, shiftId);
    return this.db.volunteerShift.update({
      where: { id: shiftId },
      data: { status: VolunteerShiftStatus.COMPLETED },
      select: SHIFT_SELECT,
    });
  }

  // ─── HOURS ─────────────────────────────────────────────────────────────────

  async logHours(tenantId: string, dto: LogHoursDto) {
    const { memberId, opportunityId, shiftId, date, hoursWorked, description, approvedByUserId } = dto;

    const opp = await this.db.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, tenantId: true },
    });
    if (!opp || opp.tenantId !== tenantId) {
      throw new NotFoundException(`Volunteer opportunity ${opportunityId} not found`);
    }

    if (shiftId) {
      const shift = await this.db.volunteerShift.findUnique({
        where: { id: shiftId },
        select: { id: true, tenantId: true },
      });
      if (!shift || shift.tenantId !== tenantId) {
        throw new NotFoundException(`Shift ${shiftId} not found`);
      }
    }

    const isPreApproved = Boolean(approvedByUserId);

    return this.db.volunteerHours.create({
      data: {
        tenantId,
        memberId,
        opportunityId,
        shiftId: shiftId ?? null,
        hours: hoursWorked,
        date: new Date(date),
        description: description ?? null,
        isApproved: isPreApproved,
        approvedAt: isPreApproved ? new Date() : null,
      },
    });
  }

  async approveHours(tenantId: string, hourLogId: string, _approverId: string) {
    const log = await this.db.volunteerHours.findUnique({
      where: { id: hourLogId },
      select: { id: true, tenantId: true, isApproved: true },
    });
    if (!log || log.tenantId !== tenantId) {
      throw new NotFoundException(`Hour log ${hourLogId} not found`);
    }
    if (log.isApproved) {
      throw new BadRequestException('Hours are already approved');
    }

    return this.db.volunteerHours.update({
      where: { id: hourLogId },
      data: { isApproved: true, approvedAt: new Date() },
    });
  }

  async rejectHours(tenantId: string, hourLogId: string, dto: RejectHoursDto) {
    const log = await this.db.volunteerHours.findUnique({
      where: { id: hourLogId },
      select: { id: true, tenantId: true, isApproved: true },
    });
    if (!log || log.tenantId !== tenantId) {
      throw new NotFoundException(`Hour log ${hourLogId} not found`);
    }
    if (log.isApproved) {
      throw new BadRequestException('Cannot reject already-approved hours');
    }

    this.logger.log(`Hour log ${hourLogId} rejected: ${dto.reason}`);
    await this.db.volunteerHours.delete({ where: { id: hourLogId } });
    return { rejected: true, hourLogId, reason: dto.reason };
  }

  async getMemberHours(tenantId: string, memberId: string) {
    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: { id: true, tenantId: true, firstName: true, lastName: true, email: true },
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    const logs = await this.db.volunteerHours.findMany({
      where: { tenantId, memberId },
      orderBy: { date: 'desc' },
    });

    const totalApprovedHours = logs.filter((l) => l.isApproved).reduce((s, l) => s + l.hours, 0);
    const totalPendingHours = logs.filter((l) => !l.isApproved).reduce((s, l) => s + l.hours, 0);

    const byOpportunity = logs.reduce<Record<string, { opportunityId: string; hours: number; entries: number }>>(
      (acc, l) => {
        const key = l.opportunityId ?? 'unlinked';
        if (!acc[key]) acc[key] = { opportunityId: key, hours: 0, entries: 0 };
        acc[key].hours += l.hours;
        acc[key].entries += 1;
        return acc;
      },
      {},
    );

    return { member, totalApprovedHours, totalPendingHours, byOpportunity: Object.values(byOpportunity), logs };
  }

  async getOrganizationHours(tenantId: string, filterDto: FilterHoursDto) {
    const { memberId, opportunityId, isApproved, startDate, endDate, page, limit } = filterDto;

    const where: Prisma.VolunteerHoursWhereInput = {
      tenantId,
      ...(memberId && { memberId }),
      ...(opportunityId && { opportunityId }),
      ...(isApproved !== undefined && { isApproved }),
      ...(startDate && { date: { gte: new Date(startDate) } }),
      ...(endDate && { date: { lte: new Date(endDate) } }),
    };

    const [totalResult, topVolunteers, byOpportunity, logs, count] = await Promise.all([
      this.db.volunteerHours.aggregate({ where: { ...where, isApproved: true }, _sum: { hours: true } }),
      this.db.volunteerHours.groupBy({
        by: ['memberId'],
        where: { ...where, isApproved: true },
        _sum: { hours: true },
        orderBy: { _sum: { hours: 'desc' } },
        take: 10,
      }),
      this.db.volunteerHours.groupBy({
        by: ['opportunityId'],
        where: { ...where, isApproved: true },
        _sum: { hours: true },
        orderBy: { _sum: { hours: 'desc' } },
      }),
      this.db.volunteerHours.findMany({
        where,
        include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.volunteerHours.count({ where }),
    ]);

    return {
      totalApprovedHours: totalResult._sum.hours ?? 0,
      topVolunteers,
      byOpportunity,
      logs,
      meta: new PaginationMetaDto(count, page, limit),
    };
  }

  // ─── STATS ─────────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const now = new Date();

    const [activeOpportunities, pendingApplications, hoursResult, upcomingShifts, uniqueVolunteers] =
      await Promise.all([
        this.db.volunteerOpportunity.count({ where: { tenantId, isActive: true } }),
        this.db.volunteerApplication.count({
          where: { tenantId, status: VolunteerApplicationStatus.PENDING },
        }),
        this.db.volunteerHours.aggregate({
          where: { tenantId, isApproved: true },
          _sum: { hours: true },
        }),
        this.db.volunteerShift.count({
          where: {
            tenantId,
            startsAt: { gte: now },
            status: { notIn: [VolunteerShiftStatus.CANCELED] },
          },
        }),
        this.db.volunteerHours.groupBy({
          by: ['memberId'],
          where: { tenantId, isApproved: true },
        }),
      ]);

    return {
      activeOpportunities,
      totalVolunteers: uniqueVolunteers.length,
      totalHoursLogged: hoursResult._sum.hours ?? 0,
      pendingApplications,
      upcomingShifts,
    };
  }

  async getMemberVolunteerProfile(tenantId: string, memberId: string) {
    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: {
        id: true, tenantId: true, firstName: true, lastName: true,
        email: true, phone: true, avatarUrl: true,
      },
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    const [applications, hours, skills] = await Promise.all([
      this.db.volunteerApplication.findMany({
        where: { tenantId, memberId },
        select: {
          id: true, status: true, coverLetter: true, reviewedAt: true, createdAt: true,
          opportunity: { select: { id: true, title: true, slug: true, startsAt: true, endsAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.volunteerHours.findMany({
        where: { tenantId, memberId },
        orderBy: { date: 'desc' },
      }),
      this.db.memberVolunteerSkill.findMany({
        where: { memberId },
        select: { skill: { select: { id: true, name: true, isRequired: true, opportunityId: true } } },
      }),
    ]);

    const totalApprovedHours = hours.filter((h) => h.isApproved).reduce((s, h) => s + h.hours, 0);

    return {
      member,
      applications,
      hours,
      skills: skills.map((s) => s.skill),
      totalApprovedHours,
      totalApplications: applications.length,
      approvedApplications: applications.filter((a) => a.status === VolunteerApplicationStatus.APPROVED).length,
    };
  }

  // ─── EXPORT / CERTIFICATE ──────────────────────────────────────────────────

  async exportVolunteerReport(tenantId: string, filterDto: FilterHoursDto): Promise<Buffer> {
    const { memberId, opportunityId, isApproved, startDate, endDate } = filterDto;

    const hours = await this.db.volunteerHours.findMany({
      where: {
        tenantId,
        ...(memberId && { memberId }),
        ...(opportunityId && { opportunityId }),
        ...(isApproved !== undefined && { isApproved }),
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
      },
      include: { member: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: [{ date: 'asc' }, { memberId: 'asc' }],
    });

    const escape = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone',
      'Opportunity ID', 'Shift ID', 'Date', 'Hours', 'Description', 'Approved', 'Approved At',
    ];
    const rows = hours.map((h) => [
      h.member.firstName, h.member.lastName, h.member.email, h.member.phone ?? '',
      h.opportunityId ?? '', h.shiftId ?? '',
      h.date.toISOString().split('T')[0],
      h.hours.toFixed(2), h.description ?? '',
      h.isApproved ? 'Yes' : 'No',
      h.approvedAt?.toISOString() ?? '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    return Buffer.from(csv, 'utf-8');
  }

  async generateVolunteerCertificate(tenantId: string, memberId: string): Promise<Buffer> {
    const member = await this.db.member.findUnique({
      where: { id: memberId },
      select: { id: true, tenantId: true, firstName: true, lastName: true },
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    const [hoursResult, tenant] = await Promise.all([
      this.db.volunteerHours.aggregate({
        where: { tenantId, memberId, isApproved: true },
        _sum: { hours: true },
      }),
      this.db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);

    const totalHours = hoursResult._sum.hours ?? 0;
    const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Volunteer Certificate — ${member.firstName} ${member.lastName}</title>
  <style>
    body{font-family:Georgia,serif;text-align:center;padding:60px;color:#1a1a1a}
    .cert{border:8px solid #c0a060;padding:60px;max-width:700px;margin:0 auto}
    h1{font-size:48px;color:#c0a060;margin-bottom:0}
    h2{font-size:28px;font-weight:normal;margin-top:8px}
    .name{font-size:40px;font-weight:bold;border-bottom:2px solid #c0a060;display:inline-block;padding:0 24px 8px;margin:24px 0}
    .hours{font-size:22px;color:#555;margin:16px 0}
    .org{font-size:18px;font-style:italic}
    .date{margin-top:40px;font-size:14px;color:#888}
  </style>
</head>
<body>
  <div class="cert">
    <h1>Certificate of Volunteer Service</h1>
    <h2>This certifies that</h2>
    <div class="name">${member.firstName} ${member.lastName}</div>
    <p class="hours">has contributed <strong>${totalHours.toFixed(1)} approved hours</strong> of volunteer service</p>
    <p class="org">in recognition of their dedication to <em>${tenant?.name ?? 'our organization'}</em></p>
    <p class="date">Issued on ${issuedDate}</p>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }

  // ─── REMINDERS (scheduled / on-demand) ────────────────────────────────────

  async sendShiftReminders(tenantId: string) {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1_000);

    const shifts = await this.db.volunteerShift.findMany({
      where: {
        tenantId,
        startsAt: { gte: now, lte: in24Hours },
        status: { notIn: [VolunteerShiftStatus.CANCELED, VolunteerShiftStatus.COMPLETED] },
      },
      include: {
        opportunity: { select: { id: true, title: true } },
        signups: {
          where: { canceledAt: null },
          include: { member: { select: { id: true, firstName: true, email: true } } },
        },
      },
    });

    let sent = 0;
    for (const shift of shifts) {
      for (const signup of shift.signups) {
        // TODO: Integrate CommunicationsModule to dispatch actual emails
        this.logger.log(
          `[ShiftReminder] → ${signup.member.email}: ` +
            `"${shift.opportunity.title}" / "${shift.name}" at ${shift.startsAt.toISOString()}`,
        );
        sent++;
      }
    }

    return { sent, shifts: shifts.length };
  }
}
