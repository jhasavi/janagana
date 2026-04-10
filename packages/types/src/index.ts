// Export the new granular permissions system
export * from './permissions';

// Legacy exports for backward compatibility
export type LegacyRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VOLUNTEER';

export type OrgFlowRole = 'owner' | 'admin' | 'staff' | 'readonly' | 'member';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: LegacyRole;
}

export interface Membership {
  id: string;
  tenantId: string;
  memberId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  startedAt: string;
  endedAt?: string | null;
}

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
}

export interface VolunteerShift {
  id: string;
  tenantId: string;
  eventId?: string | null;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
}
