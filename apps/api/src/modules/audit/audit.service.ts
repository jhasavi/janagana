import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { AuditLogFilterDto } from './dto/audit-filter.dto';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(
    tenantId: string,
    userId: string | null,
    action: string,
    description?: string,
    details?: Record<string, unknown>,
    entityType?: string,
    entityId?: string,
  ) {
    return this.db.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        description: description ?? null,
        details: details as any,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
      },
    });
  }

  async getLogs(tenantId: string, filter: AuditLogFilterDto) {
    const where: any = { tenantId };

    if (filter.userId) {
      where.userId = { contains: filter.userId, mode: 'insensitive' };
    }
    if (filter.action) {
      where.action = { contains: filter.action, mode: 'insensitive' };
    }
    if (filter.entityType) {
      where.entityType = filter.entityType;
    }
    if (filter.entityId) {
      where.entityId = filter.entityId;
    }
    if (filter.query) {
      where.OR = [
        { action: { contains: filter.query, mode: 'insensitive' } },
        { description: { contains: filter.query, mode: 'insensitive' } },
      ];
    }
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) {
        where.createdAt.gte = new Date(filter.fromDate);
      }
      if (filter.toDate) {
        where.createdAt.lte = new Date(filter.toDate);
      }
    }

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { data, total, page: filter.page, limit: filter.limit };
  }
}
