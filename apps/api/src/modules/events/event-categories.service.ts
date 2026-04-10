import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateEventCategoryDto, UpdateEventCategoryDto } from './dto/create-event.dto';

@Injectable()
export class EventCategoriesService {
  private readonly logger = new Logger(EventCategoriesService.name);

  constructor(private readonly db: DatabaseService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private async buildUniqueSlug(tenantId: string, name: string, excludeId?: string): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let attempt = 0;
    while (true) {
      const existing = await this.db.eventCategory.findFirst({
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

  private async assertCategory(tenantId: string, categoryId: string) {
    const cat = await this.db.eventCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true },
    });
    if (!cat || cat.tenantId !== tenantId) {
      throw new NotFoundException(`Event category ${categoryId} not found`);
    }
    return cat;
  }

  // ─── findAll ───────────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;

    const where: Prisma.EventCategoryWhereInput = { tenantId };

    const [total, data] = await Promise.all([
      this.db.eventCategory.count({ where }),
      this.db.eventCategory.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          createdAt: true,
          _count: { select: { events: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  // ─── findOne ───────────────────────────────────────────────────────────────

  async findOne(tenantId: string, categoryId: string) {
    const cat = await this.db.eventCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { events: true } },
      },
    });
    if (!cat || cat.tenantId !== tenantId) {
      throw new NotFoundException(`Event category ${categoryId} not found`);
    }
    return cat;
  }

  // ─── create ────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateEventCategoryDto) {
    const slug = await this.buildUniqueSlug(tenantId, dto.name);

    return this.db.eventCategory.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        color: dto.color,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });
  }

  // ─── update ────────────────────────────────────────────────────────────────

  async update(tenantId: string, categoryId: string, dto: UpdateEventCategoryDto) {
    await this.assertCategory(tenantId, categoryId);

    const data: Prisma.EventCategoryUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = await this.buildUniqueSlug(tenantId, dto.name, categoryId);
    }
    if (dto.color !== undefined) data.color = dto.color;

    return this.db.eventCategory.update({
      where: { id: categoryId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        updatedAt: true,
        _count: { select: { events: true } },
      },
    });
  }

  // ─── delete ────────────────────────────────────────────────────────────────

  async delete(tenantId: string, categoryId: string) {
    await this.assertCategory(tenantId, categoryId);

    const eventCount = await this.db.event.count({ where: { categoryId } });
    if (eventCount > 0) {
      throw new ConflictException(
        `Cannot delete category — ${eventCount} event(s) are still assigned to it`,
      );
    }

    await this.db.eventCategory.delete({ where: { id: categoryId } });
    return { deleted: true, id: categoryId };
  }
}
