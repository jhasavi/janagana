// ─── Enums ────────────────────────────────────────────────────────────────────

export type VolunteerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type VolunteerShiftStatus = 'OPEN' | 'FULL' | 'CANCELED' | 'COMPLETED';

export type VolunteerCategory =
  | 'FUNDRAISING'
  | 'EVENTS'
  | 'ADMIN'
  | 'OUTREACH'
  | 'EDUCATION'
  | 'OTHER';

export type VolunteerCommitment = 'ONE_TIME' | 'RECURRING' | 'ONGOING';

// ─── Location ─────────────────────────────────────────────────────────────────

export interface VolunteerLocation {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

// ─── Skill ───────────────────────────────────────────────────────────────────

export interface VolunteerSkill {
  id: string;
  name: string;
  isRequired: boolean;
  opportunityId: string;
}

// ─── Shift ───────────────────────────────────────────────────────────────────

export interface ShiftCount {
  signups: number;
}

export interface VolunteerShift {
  id: string;
  tenantId: string;
  opportunityId: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: VolunteerShiftStatus;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  _count: ShiftCount;
}

export interface ShiftSignup {
  id: string;
  confirmedAt: string | null;
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
}

export interface ShiftRoster {
  shift: Pick<VolunteerShift, 'id' | 'name' | 'startsAt' | 'endsAt' | 'capacity' | 'status'>;
  signups: ShiftSignup[];
  count: number;
}

// ─── Opportunity ─────────────────────────────────────────────────────────────

export interface OpportunityCount {
  applications: number;
  shifts: number;
}

export interface VolunteerOpportunityListItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  location: string | null;
  isVirtual: boolean;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  totalHours: number | null;
  createdAt: string;
  updatedAt: string;
  skills: VolunteerSkill[];
  _count: OpportunityCount;
}

export interface VolunteerOpportunityDetail extends VolunteerOpportunityListItem {
  shifts: VolunteerShift[];
}

// ─── Application ─────────────────────────────────────────────────────────────

export interface ApplicationMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export interface ApplicationOpportunity {
  id: string;
  title: string;
  slug: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface VolunteerApplication {
  id: string;
  tenantId: string;
  opportunityId: string;
  memberId: string;
  status: VolunteerApplicationStatus;
  coverLetter: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: ApplicationOpportunity;
  member: ApplicationMember;
}

// ─── Hours ────────────────────────────────────────────────────────────────────

export interface VolunteerHoursLog {
  id: string;
  tenantId: string;
  memberId: string;
  opportunityId: string | null;
  shiftId: string | null;
  hours: number;
  date: string;
  description: string | null;
  isApproved: boolean;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface MemberHoursBreakdown {
  member: ApplicationMember;
  totalApprovedHours: number;
  totalPendingHours: number;
  byOpportunity: Array<{ opportunityId: string; hours: number; entries: number }>;
  logs: VolunteerHoursLog[];
}

export interface OrgHoursReport {
  totalApprovedHours: number;
  topVolunteers: Array<{ memberId: string; _sum: { hours: number | null } }>;
  byOpportunity: Array<{ opportunityId: string | null; _sum: { hours: number | null } }>;
  logs: VolunteerHoursLog[];
  meta: PaginationMeta;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface VolunteerStats {
  activeOpportunities: number;
  totalVolunteers: number;
  totalHoursLogged: number;
  pendingApplications: number;
  upcomingShifts: number;
}

// ─── Member Volunteer Profile ──────────────────────────────────────────────────

export interface MemberVolunteerProfile {
  member: ApplicationMember;
  applications: VolunteerApplication[];
  hours: VolunteerHoursLog[];
  skills: VolunteerSkill[];
  totalApprovedHours: number;
  totalApplications: number;
  approvedApplications: number;
}

// ─── Shared pagination meta ────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface OpportunityFilters {
  page?: number;
  limit?: number;
  search?: string;
  isVirtual?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  opportunityId?: string;
  memberId?: string;
  status?: VolunteerApplicationStatus;
  startDate?: string;
  endDate?: string;
}

export interface HoursFilters {
  page?: number;
  limit?: number;
  memberId?: string;
  opportunityId?: string;
  isApproved?: boolean;
  startDate?: string;
  endDate?: string;
}
