import { Injectable } from '@nestjs/common';
import {
  PaymentStatus,
  MemberStatus,
  MembershipSubscriptionStatus,
  BillingInterval,
  VolunteerApplicationStatus,
  RegistrationStatus,
} from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import type { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Date helpers ──────────────────────────────────────────────────────────

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  }

  private getLastNMonthKeys(n: number): string[] {
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      keys.push(this.monthKey(d));
    }
    return keys;
  }

  // ─── Dashboard overview ────────────────────────────────────────────────────

  async getOverview(tenantId: string) {
    return this.getDashboardStats(tenantId);
  }

  async getDashboardStats(tenantId: string) {
    const cacheKey = `dashboard:${tenantId}`;
    const cached = await this.cacheService.get<unknown>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const monthStart = this.startOfMonth(now);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalMembers,
      activeMembers,
      newThisMonth,
      upcomingEvents,
      registrationsThisMonth,
      volunteerAgg,
      activeVolunteers,
      activeClubs,
      clubMembers,
      revenueAgg,
      pendingMemberApplications,
      pendingVolunteerApplications,
      pendingHourApprovals,
      expiringMemberships,
    ] = await Promise.all([
      this.db.member.count({ where: { tenantId } }),
      this.db.member.count({ where: { tenantId, status: MemberStatus.ACTIVE } }),
      this.db.member.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      this.db.event.count({ where: { tenantId, startsAt: { gt: now } } }),
      this.db.eventRegistration.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      this.db.volunteerHours.aggregate({
        where: { tenantId, isApproved: true, date: { gte: monthStart } },
        _sum: { hours: true },
      }),
      this.db.volunteerHours.groupBy({
        by: ['memberId'],
        where: { tenantId, isApproved: true, date: { gte: monthStart } },
        _count: { memberId: true },
      }).then(r => r.length),
      this.db.club.count({ where: { tenantId, isActive: true } }),
      this.db.clubMembership.count({ where: { tenantId } }),
      this.db.payment.aggregate({
        where: { tenantId, status: PaymentStatus.SUCCEEDED, paidAt: { gte: monthStart } },
        _sum: { amountCents: true },
      }),
      this.db.member.count({ where: { tenantId, status: MemberStatus.PENDING } }),
      this.db.volunteerApplication.count({ where: { tenantId, status: VolunteerApplicationStatus.PENDING } }),
      this.db.volunteerHours.count({ where: { tenantId, isApproved: false } }),
      this.db.membershipSubscription.count({
        where: { tenantId, status: MembershipSubscriptionStatus.ACTIVE, endsAt: { lte: thirtyDaysLater, gte: now } },
      }),
    ]);

    const result = {
      totalMembers,
      activeMembers,
      newThisMonth,
      upcomingEvents,
      registrationsThisMonth,
      volunteerHoursThisMonth: Math.round((volunteerAgg._sum.hours ?? 0) * 10) / 10,
      activeVolunteers,
      activeClubs,
      clubMembers,
      revenueThisMonth: Math.round((revenueAgg._sum?.amountCents ?? 0) / 100),
      pendingMemberApplications,
      pendingVolunteerApplications,
      pendingHourApprovals,
      expiringMemberships,
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  // ─── Activity feed ─────────────────────────────────────────────────────────

  async getActivityFeed(tenantId: string) {
    const cacheKey = `activity:${tenantId}`;
    const cached = await this.cacheService.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const [recentMembers, registrations, applications, payments, clubJoins] = await Promise.all([
      this.db.member.findMany({
        where: { tenantId: tenantId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.db.eventRegistration.findMany({
        where: { tenantId },
        select: {
          id: true, createdAt: true,
          member: { select: { firstName: true, lastName: true, avatarUrl: true } },
          event: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.db.volunteerApplication.findMany({
        where: { tenantId },
        select: {
          id: true, createdAt: true,
          member: { select: { firstName: true, lastName: true, avatarUrl: true } },
          opportunity: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.db.payment.findMany({
        where: { tenantId, status: PaymentStatus.SUCCEEDED },
        select: {
          id: true, paidAt: true, amountCents: true,
          member: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 6,
      }),
      this.db.clubMembership.findMany({
        where: { tenantId },
        select: {
          id: true, createdAt: true,
          member: { select: { firstName: true, lastName: true, avatarUrl: true } },
          club: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    type ActivityItem = {
      id: string; type: string; actorName: string;
      actorAvatarUrl?: string | null; description: string; timestamp: string;
    };

    const items: ActivityItem[] = [
      ...recentMembers.map(m => ({
        id: `member-${m.id}`, type: 'member_join',
        actorName: `${m.firstName} ${m.lastName}`, actorAvatarUrl: m.avatarUrl,
        description: 'Joined the organisation', timestamp: m.createdAt.toISOString(),
      })),
      ...registrations.map(r => ({
        id: `reg-${r.id}`, type: 'event_registration',
        actorName: `${r.member.firstName} ${r.member.lastName}`, actorAvatarUrl: r.member.avatarUrl,
        description: `Registered for "${r.event.title}"`, timestamp: r.createdAt.toISOString(),
      })),
      ...applications.map(a => ({
        id: `app-${a.id}`, type: 'volunteer_application',
        actorName: `${a.member.firstName} ${a.member.lastName}`, actorAvatarUrl: a.member.avatarUrl,
        description: `Applied to volunteer for "${a.opportunity.title}"`, timestamp: a.createdAt.toISOString(),
      })),
      ...payments.filter(p => p.member).map(p => ({
        id: `pay-${p.id}`, type: 'payment',
        actorName: `${p.member!.firstName} ${p.member!.lastName}`, actorAvatarUrl: p.member!.avatarUrl,
        description: `Payment of $${(p.amountCents / 100).toFixed(2)} received`,
        timestamp: (p.paidAt ?? new Date()).toISOString(),
      })),
      ...clubJoins.map(c => ({
        id: `club-${c.id}`, type: 'club_join',
        actorName: `${c.member.firstName} ${c.member.lastName}`, actorAvatarUrl: c.member.avatarUrl,
        description: `Joined the ${c.club.name} club`, timestamp: c.createdAt.toISOString(),
      })),
    ];

    const sorted = items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    await this.cacheService.set(cacheKey, sorted, 60);
    return sorted;
  }

  // ─── Upcoming events ───────────────────────────────────────────────────────

  async getUpcomingEvents(tenantId: string) {
    const cacheKey = `upcoming:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.db.event.findMany({
      where: { tenantId, startsAt: { gt: new Date() } },
      select: {
        id: true, title: true, slug: true, startsAt: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    await this.cacheService.set(cacheKey, result, 120);
    return result;
  }

  // ─── Member analytics ──────────────────────────────────────────────────────

  async getMemberAnalytics(tenantId: string, dto?: DateRangeDto) {
    const cacheKey = `members:${tenantId}:${dto?.startDate ?? ''}:${dto?.endDate ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const monthKeys = this.getLastNMonthKeys(12);
    const rangeStart = new Date(monthKeys[0] + '-01');

    const [allMembers, statusCounts, tierSubs, tiers] = await Promise.all([
      this.db.member.findMany({
        where: { tenantId },
        select: { createdAt: true, status: true },
      }),
      this.db.member.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.db.membershipSubscription.findMany({
        where: { tenantId, status: MembershipSubscriptionStatus.ACTIVE },
        select: { tierId: true },
      }),
      this.db.membershipTier.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const countByMonth = new Map<string, number>();
    for (const m of allMembers) {
      const k = this.monthKey(m.createdAt);
      countByMonth.set(k, (countByMonth.get(k) ?? 0) + 1);
    }

    let running = allMembers.filter(m => m.createdAt < rangeStart).length;
    const growth = monthKeys.map(k => {
      const newMembers = countByMonth.get(k) ?? 0;
      running += newMembers;
      return { month: this.monthLabel(k), total: running, newMembers };
    });

    const statusDistribution = statusCounts.map(s => ({
      name: s.status,
      value: s._count.id,
    }));

    const tierMap = Object.fromEntries(tiers.map(t => [t.id, t.name]));
    const tierCount = new Map<string, number>();
    for (const sub of tierSubs) {
      tierCount.set(sub.tierId, (tierCount.get(sub.tierId) ?? 0) + 1);
    }
    const tierDistribution = Array.from(tierCount.entries()).map(([id, count]) => ({
      name: tierMap[id] ?? 'Unknown',
      value: count,
    }));

    const result = { growth, statusDistribution, tierDistribution };
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  // ─── Event analytics ───────────────────────────────────────────────────────

  async getEventAnalytics(tenantId: string, dto?: DateRangeDto) {
    const cacheKey = `events:${tenantId}:${dto?.startDate ?? ''}:${dto?.endDate ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const monthKeys = this.getLastNMonthKeys(12);
    const rangeStart = new Date(monthKeys[0] + '-01');

    const [events, registrations] = await Promise.all([
      this.db.event.findMany({
        where: { tenantId, startsAt: { gte: rangeStart } },
        select: { id: true, title: true, startsAt: true },
      }),
      this.db.eventRegistration.findMany({
        where: { tenantId, createdAt: { gte: rangeStart } },
        select: { eventId: true, amountCents: true, createdAt: true, status: true },
      }),
    ]);

    const eventsByMonth = new Map<string, number>();
    for (const e of events) {
      const k = this.monthKey(e.startsAt);
      eventsByMonth.set(k, (eventsByMonth.get(k) ?? 0) + 1);
    }
    const regsByMonth = new Map<string, number>();
    for (const r of registrations) {
      const k = this.monthKey(r.createdAt);
      regsByMonth.set(k, (regsByMonth.get(k) ?? 0) + 1);
    }
    const eventsPerMonth = monthKeys.map(k => ({
      month: this.monthLabel(k),
      events: eventsByMonth.get(k) ?? 0,
      registrations: regsByMonth.get(k) ?? 0,
    }));

    const revenueByEvent = new Map<string, { title: string; revenue: number }>();
    for (const e of events) revenueByEvent.set(e.id, { title: e.title, revenue: 0 });
    for (const r of registrations) {
      const e = revenueByEvent.get(r.eventId);
      if (e) e.revenue += r.amountCents;
    }
    const revenuePerEvent = Array.from(revenueByEvent.values())
      .filter(e => e.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(e => ({ ...e, revenue: Math.round(e.revenue / 100) }));

    const totalRegistrations = registrations.length;
    const confirmed = registrations.filter(r =>
      r.status === RegistrationStatus.CONFIRMED || r.status === RegistrationStatus.ATTENDED,
    ).length;
    const attendanceRate = totalRegistrations > 0 ? Math.round((confirmed / totalRegistrations) * 100) : 0;

    const result = { eventsPerMonth, revenuePerEvent, totalRegistrations, attendanceRate };
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  // ─── Volunteer analytics ───────────────────────────────────────────────────

  async getVolunteerAnalytics(tenantId: string, dto?: DateRangeDto) {
    const cacheKey = `volunteers:${tenantId}:${dto?.startDate ?? ''}:${dto?.endDate ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const monthKeys = this.getLastNMonthKeys(12);
    const rangeStart = new Date(monthKeys[0] + '-01');
    const monthStart = this.startOfMonth(new Date());

    const [hours, thisMonthHours, appStats, activeCount] = await Promise.all([
      this.db.volunteerHours.findMany({
        where: { tenantId, isApproved: true, date: { gte: rangeStart } },
        select: { hours: true, date: true },
      }),
      this.db.volunteerHours.findMany({
        where: { tenantId, isApproved: true, date: { gte: monthStart } },
        select: { memberId: true, hours: true, member: { select: { firstName: true, lastName: true } } },
      }),
      this.db.volunteerApplication.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.db.member.count({ where: { tenantId, status: MemberStatus.ACTIVE } }),
    ]);

    const hoursByMonth = new Map<string, number>();
    for (const h of hours) {
      const k = this.monthKey(h.date);
      hoursByMonth.set(k, (hoursByMonth.get(k) ?? 0) + h.hours);
    }
    const hoursPerMonth = monthKeys.map(k => ({
      month: this.monthLabel(k),
      hours: Math.round((hoursByMonth.get(k) ?? 0) * 10) / 10,
    }));

    const memberHours = new Map<string, { name: string; hours: number }>();
    for (const h of thisMonthHours) {
      const existing = memberHours.get(h.memberId);
      const name = `${h.member.firstName} ${h.member.lastName}`;
      if (existing) existing.hours += h.hours;
      else memberHours.set(h.memberId, { name, hours: h.hours });
    }
    const topVolunteers = Array.from(memberHours.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
      .map(v => ({ ...v, hours: Math.round(v.hours * 10) / 10 }));

    const appStatsMap = { pending: 0, approved: 0, rejected: 0 };
    for (const s of appStats) {
      if (s.status === VolunteerApplicationStatus.PENDING) appStatsMap.pending = s._count.id;
      else if (s.status === VolunteerApplicationStatus.APPROVED) appStatsMap.approved = s._count.id;
      else if (s.status === VolunteerApplicationStatus.REJECTED) appStatsMap.rejected = s._count.id;
    }
    const reviewed = appStatsMap.approved + appStatsMap.rejected;
    const conversionRate = reviewed > 0 ? Math.round((appStatsMap.approved / reviewed) * 100) : 0;
    const participationRate = activeCount > 0 ? Math.round((memberHours.size / activeCount) * 100) : 0;

    const result = { hoursPerMonth, topVolunteers, applicationStats: appStatsMap, conversionRate, participationRate };
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  // ─── Club analytics ────────────────────────────────────────────────────────

  async getClubAnalytics(tenantId: string, dto?: DateRangeDto) {
    const cacheKey = `clubs:${tenantId}:${dto?.startDate ?? ''}:${dto?.endDate ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const monthKeys = this.getLastNMonthKeys(6);
    const rangeStart = new Date(monthKeys[0] + '-01');

    const [clubs, memberships, posts] = await Promise.all([
      this.db.club.findMany({
        where: { tenantId },
        select: { id: true, name: true, isActive: true, createdAt: true },
      }),
      this.db.clubMembership.findMany({
        where: { tenantId, createdAt: { gte: rangeStart } },
        select: { clubId: true, createdAt: true },
      }),
      this.db.clubPost.findMany({
        where: { tenantId, createdAt: { gte: rangeStart } },
        select: { clubId: true },
      }),
    ]);

    const newClubsByMonth = new Map<string, number>();
    const newMembersByMonth = new Map<string, number>();
    for (const c of clubs) {
      const k = this.monthKey(c.createdAt);
      newClubsByMonth.set(k, (newClubsByMonth.get(k) ?? 0) + 1);
    }
    for (const m of memberships) {
      const k = this.monthKey(m.createdAt);
      newMembersByMonth.set(k, (newMembersByMonth.get(k) ?? 0) + 1);
    }
    const growth = monthKeys.map(k => ({
      month: this.monthLabel(k),
      clubs: newClubsByMonth.get(k) ?? 0,
      members: newMembersByMonth.get(k) ?? 0,
    }));

    const memberCountByClub = new Map<string, number>();
    for (const m of memberships) memberCountByClub.set(m.clubId, (memberCountByClub.get(m.clubId) ?? 0) + 1);
    const postCountByClub = new Map<string, number>();
    for (const p of posts) postCountByClub.set(p.clubId, (postCountByClub.get(p.clubId) ?? 0) + 1);
    const topClubs = clubs
      .map(c => ({ id: c.id, name: c.name, memberCount: memberCountByClub.get(c.id) ?? 0, postCount: postCountByClub.get(c.id) ?? 0 }))
      .sort((a, b) => (b.memberCount + b.postCount) - (a.memberCount + a.postCount))
      .slice(0, 8);

    const active = clubs.filter(c => c.isActive).length;
    const categoryBreakdown = [
      { name: 'Active', value: active },
      { name: 'Inactive', value: clubs.length - active },
    ].filter(c => c.value > 0);

    const result = { growth, topClubs, categoryBreakdown };
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  // ─── Revenue analytics ─────────────────────────────────────────────────────

  async getRevenueAnalytics(tenantId: string, dto?: DateRangeDto) {
    const cacheKey = `revenue:${tenantId}:${dto?.startDate ?? ''}:${dto?.endDate ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const monthKeys = this.getLastNMonthKeys(12);
    const rangeStart = new Date(monthKeys[0] + '-01');

    const [payments, activeMonthlySubs] = await Promise.all([
      this.db.payment.findMany({
        where: { tenantId, status: PaymentStatus.SUCCEEDED, paidAt: { gte: rangeStart } },
        select: {
          amountCents: true, paidAt: true,
          membershipSubscriptionId: true,
          eventRegistrations: { select: { id: true } },
        },
      }),
      this.db.membershipSubscription.findMany({
        where: { tenantId, status: MembershipSubscriptionStatus.ACTIVE, billingInterval: BillingInterval.MONTHLY },
        select: { tier: { select: { monthlyPriceCents: true } } },
      }),
    ]);

    const membershipByMonth = new Map<string, number>();
    const eventsByMonth = new Map<string, number>();
    const otherByMonth = new Map<string, number>();

    for (const p of payments) {
      const k = this.monthKey(p.paidAt ?? new Date());
      if (p.membershipSubscriptionId) {
        membershipByMonth.set(k, (membershipByMonth.get(k) ?? 0) + p.amountCents);
      } else if (p.eventRegistrations.length > 0) {
        eventsByMonth.set(k, (eventsByMonth.get(k) ?? 0) + p.amountCents);
      } else {
        otherByMonth.set(k, (otherByMonth.get(k) ?? 0) + p.amountCents);
      }
    }

    const monthly = monthKeys.map(k => {
      const m = membershipByMonth.get(k) ?? 0;
      const e = eventsByMonth.get(k) ?? 0;
      const o = otherByMonth.get(k) ?? 0;
      return {
        month: this.monthLabel(k),
        total: Math.round((m + e + o) / 100),
        memberships: Math.round(m / 100),
        events: Math.round(e / 100),
        other: Math.round(o / 100),
      };
    });

    const totalPaid = payments.reduce((s, p) => s + p.amountCents, 0);
    const totalMemberships = payments.filter(p => p.membershipSubscriptionId).reduce((s, p) => s + p.amountCents, 0);
    const totalEvents = payments.filter(p => p.eventRegistrations.length > 0).reduce((s, p) => s + p.amountCents, 0);
    const totalOther = totalPaid - totalMemberships - totalEvents;

    const breakdown = [
      { type: 'Memberships', amount: Math.round(totalMemberships / 100), percentage: totalPaid > 0 ? Math.round((totalMemberships / totalPaid) * 100) : 0 },
      { type: 'Events', amount: Math.round(totalEvents / 100), percentage: totalPaid > 0 ? Math.round((totalEvents / totalPaid) * 100) : 0 },
      { type: 'Other', amount: Math.round(totalOther / 100), percentage: totalPaid > 0 ? Math.round((totalOther / totalPaid) * 100) : 0 },
    ].filter(b => b.amount > 0);

    const mrr = activeMonthlySubs.reduce((s, sub) => s + sub.tier.monthlyPriceCents, 0);

    const result = {
      monthly,
      breakdown,
      totalPaid: Math.round(totalPaid / 100),
      mrr: Math.round(mrr / 100),
      arr: Math.round((mrr * 12) / 100),
    };
    await this.cacheService.set(cacheKey, result);
    return result;
  }
}

