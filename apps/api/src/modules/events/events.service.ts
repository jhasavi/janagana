import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventStatus, EventFormat, RegistrationStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';
import {
  CreateEventDto,
  UpdateEventDto,
  EventSpeakerDto,
  EventSponsorDto,
  RegisterMemberDto,
  CheckInDto,
  BulkCheckInDto,
  SendRemindersDto,
} from './dto/create-event.dto';
import { FilterEventsDto } from './dto/filter-events.dto';

// ─── Select shapes ────────────────────────────────────────────────────────────

const EVENT_LIST_SELECT = {
  id: true,
  tenantId: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  status: true,
  format: true,
  location: true,
  virtualUrl: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  isPublic: true,
  isFeatured: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true, color: true } },
  _count: {
    select: {
      registrations: true,
      attendance: true,
      tickets: true,
    },
  },
} satisfies Prisma.EventSelect;

const EVENT_DETAIL_SELECT = {
  ...EVENT_LIST_SELECT,
  description: true,
  registrationOpensAt: true,
  registrationClosesAt: true,
  createdAt: true,
  updatedAt: true,
  tickets: {
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      isFree: true,
      capacity: true,
      quantitySold: true,
      salesStart: true,
      salesEnd: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  speakers: {
    select: {
      id: true,
      name: true,
      title: true,
      company: true,
      bio: true,
      avatarUrl: true,
      websiteUrl: true,
      twitterUrl: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  sponsors: {
    select: {
      id: true,
      name: true,
      tier: true,
      logoUrl: true,
      websiteUrl: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.EventSelect;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private generateConfirmationCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  private async buildUniqueSlug(tenantId: string, title: string, excludeId?: string): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    let attempt = 0;
    while (true) {
      const existing = await this.db.event.findFirst({
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

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, tenantId: true, status: true, capacity: true },
    });
    if (!event || event.tenantId !== tenantId) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }
    return event;
  }

  // ─── findAll ───────────────────────────────────────────────────────────────

  async findAll(tenantId: string, filterDto: FilterEventsDto) {
    const { page, limit, search, categoryId, status, format, startDate, endDate, isPublic, sortBy, sortOrder } =
      filterDto;

    const where: Prisma.EventWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(format && { format }),
      ...(isPublic !== undefined && { isPublic }),
      ...(startDate && { startsAt: { gte: new Date(startDate) } }),
      ...(endDate && { startsAt: { lte: new Date(endDate) } }),
    };

    const allowedSortFields: Record<string, Prisma.EventOrderByWithRelationInput> = {
      startsAt: { startsAt: sortOrder ?? 'asc' },
      title: { title: sortOrder ?? 'asc' },
      createdAt: { createdAt: sortOrder ?? 'desc' },
      status: { status: sortOrder ?? 'asc' },
    };
    const orderBy: Prisma.EventOrderByWithRelationInput =
      (sortBy ? allowedSortFields[sortBy] : undefined) ?? { startsAt: 'asc' };

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.db.event.count({ where }),
      this.db.event.findMany({
        where,
        select: EVENT_LIST_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  // ─── findOne ───────────────────────────────────────────────────────────────

  async findOne(tenantId: string, eventId: string) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: EVENT_DETAIL_SELECT,
    });
    if (!event || event.tenantId !== tenantId) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }
    return event;
  }

  // ─── create ────────────────────────────────────────────────────────────────

  async create(tenantId: string, _userId: string, dto: CreateEventDto) {
    const slug = await this.buildUniqueSlug(tenantId, dto.title);

    if (dto.categoryId) {
      const cat = await this.db.eventCategory.findUnique({
        where: { id: dto.categoryId },
        select: { tenantId: true },
      });
      if (!cat || cat.tenantId !== tenantId) {
        throw new BadRequestException(`Category ${dto.categoryId} not found`);
      }
    }

    const locationStr = dto.location ? JSON.stringify(dto.location) : undefined;

    if (dto.recurrence) {
      return this._createRecurringSeries(tenantId, dto, slug, locationStr);
    }

    return this.db.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId,
          title: dto.title,
          slug,
          description: dto.description,
          categoryId: dto.categoryId,
          coverImageUrl: dto.coverImageUrl,
          format: dto.format ?? EventFormat.IN_PERSON,
          location: locationStr,
          virtualUrl: dto.virtualLink,
          startsAt: new Date(dto.startDate),
          endsAt: dto.endDate ? new Date(dto.endDate) : null,
          registrationOpensAt: dto.registrationOpensAt ? new Date(dto.registrationOpensAt) : null,
          registrationClosesAt: dto.registrationClosesAt ? new Date(dto.registrationClosesAt) : null,
          capacity: dto.capacity,
          isPublic: dto.isPublic ?? true,
          status: EventStatus.DRAFT,
        },
        select: { id: true },
      });

      if (dto.tickets?.length) {
        await tx.eventTicket.createMany({
          data: dto.tickets.map((t, i) => ({
            eventId: event.id,
            name: t.name,
            description: t.description,
            priceCents: t.price ?? 0,
            isFree: (t.price ?? 0) === 0,
            capacity: t.quantity,
            salesStart: t.availableFrom ? new Date(t.availableFrom) : null,
            salesEnd: t.availableTo ? new Date(t.availableTo) : null,
            sortOrder: i,
          })),
        });
      }

      if (dto.speakers?.length) {
        await tx.eventSpeaker.createMany({
          data: dto.speakers.map((s, i) => ({
            eventId: event.id,
            name: s.name,
            title: s.title,
            company: s.company,
            bio: s.bio,
            avatarUrl: s.photoUrl,
            websiteUrl: s.websiteUrl,
            twitterUrl: s.twitterUrl,
            sortOrder: i,
          })),
        });
      }

      return tx.event.findUnique({ where: { id: event.id }, select: EVENT_DETAIL_SELECT });
    });
  }

  private async _createRecurringSeries(
    tenantId: string,
    dto: CreateEventDto,
    baseSlug: string,
    locationStr: string | undefined,
  ) {
    const rule = dto.recurrence!;
    const dates = this._expandRecurrence(new Date(dto.startDate), rule);
    this.logger.log(`Creating recurring series: ${dates.length} occurrences`);

    const events: unknown[] = [];
    for (let i = 0; i < dates.length; i++) {
      const startsAt = dates[i];
      const durationMs =
        dto.endDate ? new Date(dto.endDate).getTime() - new Date(dto.startDate).getTime() : 0;
      const endsAt = durationMs > 0 ? new Date(startsAt.getTime() + durationMs) : null;
      const slug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;

      const event = await this.db.event.create({
        data: {
          tenantId,
          title: i === 0 ? dto.title : `${dto.title} (${i + 1})`,
          slug,
          description: dto.description,
          categoryId: dto.categoryId,
          coverImageUrl: dto.coverImageUrl,
          format: dto.format ?? EventFormat.IN_PERSON,
          location: locationStr,
          virtualUrl: dto.virtualLink,
          startsAt,
          endsAt,
          capacity: dto.capacity,
          isPublic: dto.isPublic ?? true,
          status: EventStatus.DRAFT,
        },
        select: { id: true },
      });

      if (dto.tickets?.length) {
        await this.db.eventTicket.createMany({
          data: dto.tickets.map((t, j) => ({
            eventId: event.id,
            name: t.name,
            description: t.description,
            priceCents: t.price ?? 0,
            isFree: (t.price ?? 0) === 0,
            capacity: t.quantity,
            salesStart: t.availableFrom ? new Date(t.availableFrom) : null,
            salesEnd: t.availableTo ? new Date(t.availableTo) : null,
            sortOrder: j,
          })),
        });
      }

      events.push(await this.findOne(tenantId, event.id));
    }
    return events;
  }

  private _expandRecurrence(
    start: Date,
    rule: NonNullable<CreateEventDto['recurrence']>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = rule.interval ?? 1;
    const maxOccurrences = 52;
    const endDate = rule.endDate ? new Date(rule.endDate) : null;
    const current = new Date(start);

    while (dates.length < maxOccurrences) {
      if (endDate && current > endDate) break;

      if (rule.frequency === 'WEEKLY' && rule.daysOfWeek?.length) {
        if (rule.daysOfWeek.includes(current.getDay())) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      } else {
        dates.push(new Date(current));
        if (rule.frequency === 'DAILY') {
          current.setDate(current.getDate() + interval);
        } else if (rule.frequency === 'WEEKLY') {
          current.setDate(current.getDate() + interval * 7);
        } else {
          current.setMonth(current.getMonth() + interval);
        }
      }
    }

    return dates;
  }

  // ─── update ────────────────────────────────────────────────────────────────

  async update(tenantId: string, eventId: string, dto: UpdateEventDto) {
    await this.assertEvent(tenantId, eventId);

    const data: Prisma.EventUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
      data.slug = await this.buildUniqueSlug(tenantId, dto.title, eventId);
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.category = { connect: { id: dto.categoryId } };
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.format !== undefined) data.format = dto.format;
    if (dto.location !== undefined) data.location = JSON.stringify(dto.location);
    if (dto.virtualLink !== undefined) data.virtualUrl = dto.virtualLink;
    if (dto.startDate !== undefined) data.startsAt = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endsAt = new Date(dto.endDate);
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.registrationOpensAt !== undefined) data.registrationOpensAt = new Date(dto.registrationOpensAt);
    if (dto.registrationClosesAt !== undefined) data.registrationClosesAt = new Date(dto.registrationClosesAt);

    return this.db.event.update({
      where: { id: eventId },
      data,
      select: EVENT_DETAIL_SELECT,
    });
  }

  // ─── updateStatus ──────────────────────────────────────────────────────────

  async updateStatus(tenantId: string, eventId: string, status: EventStatus) {
    const event = await this.assertEvent(tenantId, eventId);

    const transitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELED],
      [EventStatus.PUBLISHED]: [EventStatus.CANCELED, EventStatus.COMPLETED],
      [EventStatus.CANCELED]: [],
      [EventStatus.COMPLETED]: [],
    };

    if (!transitions[event.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${event.status} to ${status}`,
      );
    }

    return this.db.event.update({
      where: { id: eventId },
      data: { status },
      select: EVENT_LIST_SELECT,
    });
  }

  // ─── delete ────────────────────────────────────────────────────────────────

  async delete(tenantId: string, eventId: string) {
    await this.assertEvent(tenantId, eventId);
    await this.db.event.delete({ where: { id: eventId } });
    return { deleted: true, id: eventId };
  }

  // ─── duplicate ─────────────────────────────────────────────────────────────

  async duplicate(tenantId: string, eventId: string) {
    const source = await this.db.event.findUnique({
      where: { id: eventId },
      include: { tickets: true, speakers: true, sponsors: true },
    });
    if (!source || source.tenantId !== tenantId) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const newSlug = await this.buildUniqueSlug(tenantId, `${source.title} (Copy)`);

    return this.db.$transaction(async (tx) => {
      const copy = await tx.event.create({
        data: {
          tenantId,
          title: `${source.title} (Copy)`,
          slug: newSlug,
          description: source.description,
          categoryId: source.categoryId,
          coverImageUrl: source.coverImageUrl,
          format: source.format,
          location: source.location,
          virtualUrl: source.virtualUrl,
          startsAt: source.startsAt,
          endsAt: source.endsAt,
          registrationOpensAt: source.registrationOpensAt,
          registrationClosesAt: source.registrationClosesAt,
          capacity: source.capacity,
          isPublic: source.isPublic,
          status: EventStatus.DRAFT,
        },
        select: { id: true },
      });

      if (source.tickets.length > 0) {
        await tx.eventTicket.createMany({
          data: source.tickets.map((t) => ({
            eventId: copy.id,
            name: t.name,
            description: t.description,
            priceCents: t.priceCents,
            isFree: t.isFree,
            capacity: t.capacity,
            salesStart: t.salesStart,
            salesEnd: t.salesEnd,
            sortOrder: t.sortOrder,
          })),
        });
      }

      if (source.speakers.length > 0) {
        await tx.eventSpeaker.createMany({
          data: source.speakers.map((s) => ({
            eventId: copy.id,
            name: s.name,
            title: s.title,
            company: s.company,
            bio: s.bio,
            avatarUrl: s.avatarUrl,
            websiteUrl: s.websiteUrl,
            twitterUrl: s.twitterUrl,
            sortOrder: s.sortOrder,
          })),
        });
      }

      if (source.sponsors.length > 0) {
        await tx.eventSponsor.createMany({
          data: source.sponsors.map((sp) => ({
            eventId: copy.id,
            name: sp.name,
            tier: sp.tier,
            logoUrl: sp.logoUrl,
            websiteUrl: sp.websiteUrl,
            sortOrder: sp.sortOrder,
          })),
        });
      }

      return tx.event.findUnique({ where: { id: copy.id }, select: EVENT_DETAIL_SELECT });
    });
  }

  // ─── registerMember ────────────────────────────────────────────────────────

  async registerMember(tenantId: string, eventId: string, dto: RegisterMemberDto) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        capacity: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
        _count: {
          select: {
            registrations: { where: { status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] } } },
          },
        },
      },
    });
    if (!event || event.tenantId !== tenantId) throw new NotFoundException(`Event ${eventId} not found`);
    if (event.status !== EventStatus.PUBLISHED) throw new BadRequestException('Event is not open for registration');

    const now = new Date();
    if (event.registrationOpensAt && event.registrationOpensAt > now)
      throw new BadRequestException('Registration has not opened yet');
    if (event.registrationClosesAt && event.registrationClosesAt < now)
      throw new BadRequestException('Registration has closed');

    const existing = await this.db.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId: dto.memberId } },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== RegistrationStatus.CANCELED) {
      throw new ConflictException('Member is already registered for this event');
    }

    const member = await this.db.member.findUnique({
      where: { id: dto.memberId },
      select: { id: true, tenantId: true },
    });
    if (!member || member.tenantId !== tenantId) throw new NotFoundException(`Member ${dto.memberId} not found`);

    let amountCents = 0;
    if (dto.ticketId) {
      const ticket = await this.db.eventTicket.findUnique({
        where: { id: dto.ticketId },
        select: { eventId: true, priceCents: true, capacity: true, quantitySold: true, salesStart: true, salesEnd: true },
      });
      if (!ticket || ticket.eventId !== eventId) throw new NotFoundException(`Ticket ${dto.ticketId} not found`);
      if (ticket.salesStart && ticket.salesStart > now) throw new BadRequestException('Ticket sales have not started');
      if (ticket.salesEnd && ticket.salesEnd < now) throw new BadRequestException('Ticket sales have ended');
      if (ticket.capacity !== null && ticket.quantitySold >= ticket.capacity)
        throw new BadRequestException('Ticket is sold out');
      amountCents = ticket.priceCents;
    }

    // If event is at capacity, add to waitlist
    if (event.capacity !== null && event._count.registrations >= event.capacity) {
      return this._addToWaitlist(tenantId, eventId, dto.memberId);
    }

    const confirmationCode = this.generateConfirmationCode();

    const registration = await this.db.$transaction(async (tx) => {
      const reg = await tx.eventRegistration.upsert({
        where: { eventId_memberId: { eventId, memberId: dto.memberId } },
        create: {
          tenantId,
          eventId,
          memberId: dto.memberId,
          ticketId: dto.ticketId,
          status: amountCents > 0 ? RegistrationStatus.PENDING : RegistrationStatus.CONFIRMED,
          amountCents,
          confirmationCode,
        },
        update: {
          status: amountCents > 0 ? RegistrationStatus.PENDING : RegistrationStatus.CONFIRMED,
          amountCents,
          confirmationCode,
          canceledAt: null,
        },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true } },
          ticket: { select: { id: true, name: true, priceCents: true } },
        },
      });

      if (dto.ticketId) {
        await tx.eventTicket.update({
          where: { id: dto.ticketId },
          data: { quantitySold: { increment: 1 } },
        });
      }

      return reg;
    });

    this.logger.log(`Member ${dto.memberId} registered for event ${eventId} [${registration.status}]`);
    // TODO: Send confirmation email via CommunicationsModule
    return registration;
  }

  private async _addToWaitlist(tenantId: string, eventId: string, memberId: string) {
    const existing = await this.db.eventWaitlist.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (existing) throw new ConflictException('Member is already on the waitlist');

    const maxPos = await this.db.eventWaitlist.aggregate({
      where: { eventId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? 0) + 1;

    const entry = await this.db.eventWaitlist.create({
      data: { tenantId, eventId, memberId, position },
      include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return { waitlisted: true, position, entry };
  }

  // ─── cancelRegistration ────────────────────────────────────────────────────

  async cancelRegistration(tenantId: string, registrationId: string, reason?: string) {
    const reg = await this.db.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, tenantId: true, eventId: true, memberId: true, ticketId: true, status: true },
    });
    if (!reg || reg.tenantId !== tenantId) throw new NotFoundException(`Registration ${registrationId} not found`);
    if (reg.status === RegistrationStatus.CANCELED) throw new BadRequestException('Registration is already canceled');

    await this.db.$transaction(async (tx) => {
      await tx.eventRegistration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.CANCELED, canceledAt: new Date() },
      });
      if (reg.ticketId) {
        await tx.eventTicket.update({
          where: { id: reg.ticketId },
          data: { quantitySold: { decrement: 1 } },
        });
      }
    });

    // TODO: Refund via PaymentsModule if amountCents > 0
    await this._processWaitlistEntry(tenantId, reg.eventId);

    this.logger.log(`Registration ${registrationId} canceled${reason ? ` — ${reason}` : ''}`);
    return { canceled: true, registrationId };
  }

  // ─── checkIn ──────────────────────────────────────────────────────────────

  async checkIn(tenantId: string, eventId: string, dto: CheckInDto) {
    await this.assertEvent(tenantId, eventId);

    if (!dto.memberId && !dto.qrCode) {
      throw new BadRequestException('Provide either memberId or qrCode');
    }

    const reg = await this.db.eventRegistration.findFirst({
      where: {
        eventId,
        ...(dto.memberId ? { memberId: dto.memberId } : { confirmationCode: dto.qrCode }),
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      },
    });
    if (!reg) throw new NotFoundException('Registration not found for check-in');
    if (reg.status === RegistrationStatus.CANCELED) throw new BadRequestException('Registration is canceled');

    const existing = await this.db.eventAttendance.findUnique({
      where: { eventId_memberId: { eventId, memberId: reg.memberId } },
    });
    if (existing) {
      return { alreadyCheckedIn: true, checkedInAt: existing.checkedInAt, member: reg.member };
    }

    await this.db.$transaction(async (tx) => {
      await tx.eventAttendance.create({
        data: {
          tenantId,
          eventId,
          memberId: reg.memberId,
          registrationId: reg.id,
          checkedInAt: new Date(),
        },
      });
      if (reg.status === RegistrationStatus.PENDING) {
        await tx.eventRegistration.update({
          where: { id: reg.id },
          data: { status: RegistrationStatus.CONFIRMED },
        });
      }
    });

    return { checkedIn: true, checkedInAt: new Date(), member: reg.member };
  }

  // ─── bulkCheckIn ──────────────────────────────────────────────────────────

  async bulkCheckIn(tenantId: string, eventId: string, dto: BulkCheckInDto) {
    await this.assertEvent(tenantId, eventId);

    const results = await Promise.allSettled(
      dto.memberIds.map((memberId) => this.checkIn(tenantId, eventId, { memberId })),
    );

    return {
      total: dto.memberIds.length,
      succeeded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results
        .map((r, i) =>
          r.status === 'rejected'
            ? { memberId: dto.memberIds[i], reason: (r as PromiseRejectedResult).reason?.message }
            : null,
        )
        .filter(Boolean),
    };
  }

  // ─── getRegistrations ─────────────────────────────────────────────────────

  async getRegistrations(
    tenantId: string,
    eventId: string,
    filter: { status?: RegistrationStatus; page?: number; limit?: number },
  ) {
    await this.assertEvent(tenantId, eventId);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;

    const where: Prisma.EventRegistrationWhereInput = {
      eventId,
      tenantId,
      ...(filter.status && { status: filter.status }),
    };

    const [total, data] = await Promise.all([
      this.db.eventRegistration.count({ where }),
      this.db.eventRegistration.findMany({
        where,
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          ticket: { select: { id: true, name: true, priceCents: true } },
          attendance: { select: { checkedInAt: true, checkedOutAt: true } },
        },
        orderBy: { registeredAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  // ─── getAttendance ────────────────────────────────────────────────────────

  async getAttendance(tenantId: string, eventId: string) {
    await this.assertEvent(tenantId, eventId);

    const [attendance, totalRegistrations] = await Promise.all([
      this.db.eventAttendance.findMany({
        where: { eventId, tenantId },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
        orderBy: { checkedInAt: 'asc' },
      }),
      this.db.eventRegistration.count({
        where: { eventId, status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] } },
      }),
    ]);

    return {
      totalRegistrations,
      totalAttendance: attendance.length,
      attendanceRate:
        totalRegistrations > 0
          ? ((attendance.length / totalRegistrations) * 100).toFixed(1)
          : '0',
      attendees: attendance,
    };
  }

  // ─── generateQRCode ───────────────────────────────────────────────────────

  async generateQRCode(tenantId: string, registrationId: string) {
    const reg = await this.db.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, tenantId: true, confirmationCode: true, memberId: true, eventId: true },
    });
    if (!reg || reg.tenantId !== tenantId) throw new NotFoundException(`Registration ${registrationId} not found`);

    let confirmationCode = reg.confirmationCode;
    if (!confirmationCode) {
      confirmationCode = this.generateConfirmationCode();
      await this.db.eventRegistration.update({ where: { id: registrationId }, data: { confirmationCode } });
    }

    // Returns a check-in URL embeddable in a QR code image.
    // Install and use the `qrcode` npm package to render the actual image.
    const appUrl = process.env.APP_URL ?? 'https://app.orgflow.io';
    const checkInUrl = `${appUrl}/check-in/${confirmationCode}`;
    return { confirmationCode, checkInUrl };
  }

  // ─── getStats ─────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const now = new Date();

    const [totalEvents, upcomingEvents, pastEvents, draftEvents, totalRegistrations, revenueAgg] =
      await Promise.all([
        this.db.event.count({ where: { tenantId } }),
        this.db.event.count({ where: { tenantId, status: EventStatus.PUBLISHED, startsAt: { gt: now } } }),
        this.db.event.count({ where: { tenantId, status: EventStatus.COMPLETED } }),
        this.db.event.count({ where: { tenantId, status: EventStatus.DRAFT } }),
        this.db.eventRegistration.count({ where: { tenantId, status: RegistrationStatus.CONFIRMED } }),
        this.db.eventRegistration.aggregate({
          where: { tenantId, status: RegistrationStatus.CONFIRMED },
          _sum: { amountCents: true },
        }),
      ]);

    const popularCategories = await this.db.eventCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { events: true } } },
      orderBy: { events: { _count: 'desc' } },
      take: 5,
    });

    const recentCompleted = await this.db.event.findMany({
      where: { tenantId, status: EventStatus.COMPLETED },
      select: { _count: { select: { registrations: true, attendance: true } } },
      take: 20,
      orderBy: { startsAt: 'desc' },
    });
    const avgAttendance =
      recentCompleted.length > 0
        ? recentCompleted.reduce((s, e) => s + e._count.attendance, 0) / recentCompleted.length
        : 0;

    return {
      totalEvents,
      upcomingEvents,
      pastEvents,
      draftEvents,
      totalRegistrations,
      totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
      averageAttendance: Math.round(avgAttendance),
      popularCategories: popularCategories.map((c) => ({
        id: c.id,
        name: c.name,
        eventCount: c._count.events,
      })),
    };
  }

  // ─── getCalendarView ──────────────────────────────────────────────────────

  async getCalendarView(tenantId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const events = await this.db.event.findMany({
      where: {
        tenantId,
        status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        startsAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        format: true,
        startsAt: true,
        endsAt: true,
        isPublic: true,
        isFeatured: true,
        category: { select: { id: true, name: true, color: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    const byDate: Record<string, typeof events> = {};
    for (const event of events) {
      const key = event.startsAt.toISOString().slice(0, 10);
      (byDate[key] ??= []).push(event);
    }

    return { month, year, start: start.toISOString(), end: end.toISOString(), events, byDate };
  }

  // ─── getPublicEvents ──────────────────────────────────────────────────────

  async getPublicEvents(tenantSlug: string) {
    const cacheKey = `public-events:${tenantSlug}`;
    const cached = await this.cacheService.get<unknown>(cacheKey);
    if (cached) return cached;

    const tenant = await this.db.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Organisation not found');

    const events = await this.db.event.findMany({
      where: { tenantId: tenant.id, status: EventStatus.PUBLISHED, isPublic: true, startsAt: { gte: new Date() } },
      select: EVENT_LIST_SELECT,
      orderBy: { startsAt: 'asc' },
      take: 50,
    });

    await this.cacheService.set(cacheKey, events, 300);
    return events;
  }

  // ─── sendReminders ────────────────────────────────────────────────────────

  async sendReminders(tenantId: string, eventId: string, dto: SendRemindersDto) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, tenantId: true, title: true, startsAt: true, status: true },
    });
    if (!event || event.tenantId !== tenantId) throw new NotFoundException(`Event ${eventId} not found`);
    if (event.status !== EventStatus.PUBLISHED) throw new BadRequestException('Only published events can send reminders');

    const registrations = await this.db.eventRegistration.findMany({
      where: { eventId, status: RegistrationStatus.CONFIRMED },
      select: { id: true, member: { select: { firstName: true, email: true } } },
    });

    // TODO: Integrate with CommunicationsModule to send actual emails.
    this.logger.log(`Sending reminder for "${event.title}" to ${registrations.length} registrant(s)`);
    return { sent: registrations.length, eventId, message: dto.customMessage ?? null };
  }

  // ─── exportRegistrations ─────────────────────────────────────────────────

  async exportRegistrations(tenantId: string, eventId: string): Promise<Buffer> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, tenantId: true },
    });
    if (!event || event.tenantId !== tenantId) throw new NotFoundException(`Event ${eventId} not found`);

    const registrations = await this.db.eventRegistration.findMany({
      where: { eventId, tenantId },
      include: {
        member: { select: { firstName: true, lastName: true, email: true, phone: true } },
        ticket: { select: { name: true } },
        attendance: { select: { checkedInAt: true } },
      },
      orderBy: { registeredAt: 'asc' },
    });

    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone',
      'Ticket', 'Status', 'Amount (cents)', 'Confirmation Code',
      'Registered At', 'Checked In At',
    ];
    const rows = registrations.map((r) => [
      r.member.firstName,
      r.member.lastName,
      r.member.email,
      r.member.phone ?? '',
      r.ticket?.name ?? '',
      r.status,
      r.amountCents.toString(),
      r.confirmationCode ?? '',
      r.registeredAt.toISOString(),
      r.attendance?.checkedInAt?.toISOString() ?? '',
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    return Buffer.from(csv, 'utf-8');
  }

  // ─── addSpeaker ───────────────────────────────────────────────────────────

  async addSpeaker(tenantId: string, eventId: string, dto: EventSpeakerDto) {
    await this.assertEvent(tenantId, eventId);
    const agg = await this.db.eventSpeaker.aggregate({ where: { eventId }, _max: { sortOrder: true } });
    return this.db.eventSpeaker.create({
      data: {
        eventId,
        name: dto.name,
        title: dto.title,
        company: dto.company,
        bio: dto.bio,
        avatarUrl: dto.photoUrl,
        websiteUrl: dto.websiteUrl,
        twitterUrl: dto.twitterUrl,
        sortOrder: (agg._max.sortOrder ?? -1) + 1,
      },
    });
  }

  // ─── addSponsor ───────────────────────────────────────────────────────────

  async addSponsor(tenantId: string, eventId: string, dto: EventSponsorDto) {
    await this.assertEvent(tenantId, eventId);
    return this.db.eventSponsor.create({
      data: {
        eventId,
        name: dto.name,
        tier: dto.tier,
        logoUrl: dto.logoUrl,
        websiteUrl: dto.websiteUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  // ─── getWaitlist ──────────────────────────────────────────────────────────

  async getWaitlist(tenantId: string, eventId: string) {
    await this.assertEvent(tenantId, eventId);
    return this.db.eventWaitlist.findMany({
      where: { eventId, tenantId },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  // ─── processWaitlist ─────────────────────────────────────────────────────

  async processWaitlist(tenantId: string, eventId: string) {
    return this._processWaitlistEntry(tenantId, eventId);
  }

  private async _processWaitlistEntry(tenantId: string, eventId: string) {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: {
        capacity: true,
        _count: {
          select: { registrations: { where: { status: RegistrationStatus.CONFIRMED } } },
        },
      },
    });
    if (!event || (event.capacity !== null && event._count.registrations >= event.capacity)) return null;

    const next = await this.db.eventWaitlist.findFirst({
      where: { eventId },
      orderBy: { position: 'asc' },
      include: { member: { select: { id: true, firstName: true, email: true } } },
    });
    if (!next) return null;

    const confirmationCode = this.generateConfirmationCode();

    await this.db.$transaction(async (tx) => {
      await tx.eventRegistration.upsert({
        where: { eventId_memberId: { eventId, memberId: next.memberId } },
        create: {
          tenantId,
          eventId,
          memberId: next.memberId,
          status: RegistrationStatus.CONFIRMED,
          amountCents: 0,
          confirmationCode,
        },
        update: { status: RegistrationStatus.CONFIRMED, canceledAt: null },
      });
      await tx.eventWaitlist.delete({ where: { id: next.id } });
      const remaining = await tx.eventWaitlist.findMany({ where: { eventId }, orderBy: { position: 'asc' } });
      for (let i = 0; i < remaining.length; i++) {
        await tx.eventWaitlist.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
      }
    });

    this.logger.log(`Promoted waitlist member ${next.memberId} to confirmed for event ${eventId}`);
    // TODO: Send notification email via CommunicationsModule
    return { promoted: true, member: next.member };
  }
}
