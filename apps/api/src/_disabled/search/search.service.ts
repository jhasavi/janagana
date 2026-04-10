import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { OrgFlowRole } from '../../common/decorators/roles.decorator';

export interface SearchResults {
  events: Array<{ id: string; title: string; slug: string; startsAt: Date; status: string }>;
  clubs: Array<{ id: string; name: string; description: string | null }>;
  opportunities: Array<{ id: string; title: string; location: string | null; isActive: boolean }>;
  members: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  announcements: Array<{ id: string; title: string; status: string }>;
}

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async search(tenantId: string, query: string, role: OrgFlowRole) {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        events: [],
        clubs: [],
        opportunities: [],
        members: [],
        announcements: [],
      };
    }

    const eventFilter = {
      tenantId,
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' as const } },
        { description: { contains: trimmed, mode: 'insensitive' as const } },
      ],
    };

    const clubFilter = {
      tenantId,
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' as const } },
        { description: { contains: trimmed, mode: 'insensitive' as const } },
      ],
    };

    const opportunityFilter = {
      tenantId,
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' as const } },
        { description: { contains: trimmed, mode: 'insensitive' as const } },
      ],
      isActive: true,
    };

    const announcementFilter = {
      tenantId,
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' as const } },
        { body: { contains: trimmed, mode: 'insensitive' as const } },
      ],
      status: 'PUBLISHED' as const,
    };

    const [events, clubs, opportunities, announcements] = await Promise.all([
      this.db.event.findMany({
        where: eventFilter,
        select: { id: true, title: true, slug: true, startsAt: true, status: true },
        take: 6,
        orderBy: { startsAt: 'asc' },
      }),
      this.db.club.findMany({
        where: clubFilter,
        select: { id: true, name: true, description: true },
        take: 6,
        orderBy: { name: 'asc' },
      }),
      this.db.volunteerOpportunity.findMany({
        where: opportunityFilter,
        select: { id: true, title: true, location: true, isActive: true },
        take: 6,
        orderBy: { startsAt: 'asc' },
      }),
      this.db.announcement.findMany({
        where: announcementFilter,
        select: { id: true, title: true, status: true },
        take: 6,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    const members = role === 'member'
      ? []
      : await this.db.member.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: trimmed, mode: 'insensitive' as const } },
            { lastName: { contains: trimmed, mode: 'insensitive' as const } },
            { email: { contains: trimmed, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true },
        take: 6,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

    return {
      events,
      clubs,
      opportunities,
      members,
      announcements,
    };
  }
}
