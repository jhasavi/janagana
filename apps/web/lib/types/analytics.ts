// ─── Analytics types for the frontend ────────────────────────────────────────

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  newThisMonth: number;
  upcomingEvents: number;
  registrationsThisMonth: number;
  volunteerHoursThisMonth: number;
  activeVolunteers: number;
  activeClubs: number;
  clubMembers: number;
  revenueThisMonth: number; // dollars
  pendingMemberApplications: number;
  pendingVolunteerApplications: number;
  pendingHourApprovals: number;
  expiringMemberships: number;
}

export interface MonthlyGrowthPoint {
  month: string;
  total: number;
  newMembers: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
}

export interface MemberAnalytics {
  growth: MonthlyGrowthPoint[];
  statusDistribution: StatusDistributionItem[];
  tierDistribution: StatusDistributionItem[];
}

export interface EventsPerMonthPoint {
  month: string;
  events: number;
  registrations: number;
}

export interface EventRevenueItem {
  title: string;
  revenue: number;
}

export interface EventAnalytics {
  eventsPerMonth: EventsPerMonthPoint[];
  revenuePerEvent: EventRevenueItem[];
  totalRegistrations: number;
  attendanceRate: number;
}

export interface HoursPerMonthPoint {
  month: string;
  hours: number;
}

export interface VolunteerLeaderItem {
  name: string;
  hours: number;
}

export interface VolunteerAnalytics {
  hoursPerMonth: HoursPerMonthPoint[];
  topVolunteers: VolunteerLeaderItem[];
  applicationStats: { pending: number; approved: number; rejected: number };
  conversionRate: number;
  participationRate: number;
}

export interface ClubGrowthPoint {
  month: string;
  clubs: number;
  members: number;
}

export interface TopClubItem {
  id: string;
  name: string;
  memberCount: number;
  postCount: number;
}

export interface ClubAnalytics {
  growth: ClubGrowthPoint[];
  topClubs: TopClubItem[];
  categoryBreakdown: StatusDistributionItem[];
}

export interface RevenueMonthlyPoint {
  month: string;
  total: number;
  memberships: number;
  events: number;
  other: number;
}

export interface RevenueBreakdownItem {
  type: string;
  amount: number;
  percentage: number;
}

export interface RevenueAnalytics {
  monthly: RevenueMonthlyPoint[];
  breakdown: RevenueBreakdownItem[];
  totalPaid: number;
  mrr: number;
  arr: number;
}

export interface ActivityItem {
  id: string;
  type: 'member_join' | 'event_registration' | 'volunteer_application' | 'payment' | 'club_join';
  actorName: string;
  actorAvatarUrl?: string | null;
  description: string;
  timestamp: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  _count: { registrations: number };
}
