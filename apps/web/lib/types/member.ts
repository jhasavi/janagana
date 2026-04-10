// ─── Enums ────────────────────────────────────────────────────────────────────

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BANNED';
export type BillingInterval = 'MONTHLY' | 'ANNUAL' | 'FREE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'URL' | 'PHONE';

// ─── Member shapes ─────────────────────────────────────────────────────────────

export interface MemberTierRef {
  id: string;
  name: string;
  slug: string;
}

export interface MemberSubscription {
  id: string;
  status: SubscriptionStatus;
  billingInterval?: BillingInterval;
  startedAt?: string;
  endsAt: string | null;
  renewsAt: string | null;
  canceledAt?: string | null;
  tier: MemberTierRef | null;
}

/** Shape returned by GET /members (list) */
export interface MemberListItem {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: MemberStatus;
  joinedAt: string;
  city: string | null;
  state: string | null;
  membershipSubscriptions: MemberSubscription[];
}

/** Shape returned by GET /members/:id (detail) */
export interface MemberDetail extends MemberListItem {
  dateOfBirth: string | null;
  address: string | null;
  postalCode: string | null;
  countryCode: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  customFieldValues: Array<{
    value: string;
    field: { id: string; name: string; slug: string; fieldType: CustomFieldType };
  }>;
  _count: {
    documents: number;
    notes: number;
    eventRegistrations: number;
    volunteerHours: number;
    clubMemberships: number;
    payments: number;
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  newThisMonth: number;
  expiringThisMonth: number;
  growthRate: number;
  byTier: Array<{ tierId: string; tierName: string; activeCount: number }>;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface MemberActivity {
  eventRegistrations: Array<{
    id: string;
    status: string;
    registeredAt: string;
    event: { id: string; title: string; startsAt: string } | null;
  }>;
  volunteerHours: Array<{
    id: string;
    hours: number;
    description: string | null;
    date: string;
  }>;
  clubMemberships: Array<{
    id: string;
    role: string;
    joinedAt: string;
    club: { id: string; name: string } | null;
  }>;
  payments: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
    description: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    isPrivate: boolean;
    createdAt: string;
    author: { id: string; fullName: string } | null;
  }>;
}

// ─── Notes & Docs ─────────────────────────────────────────────────────────────

export interface MemberNote {
  id: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string; avatarUrl?: string | null } | null;
}

export interface MemberDocument {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

// ─── Custom Fields ────────────────────────────────────────────────────────────

export interface MemberCustomField {
  id: string;
  name: string;
  slug: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  isPublic: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: string[];
  sortOrder: number;
}

// ─── Membership Tiers ─────────────────────────────────────────────────────────

export interface MembershipTier {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
  isFree: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { subscriptions: number };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email: string; reason: string }>;
}

// ─── Filter params ────────────────────────────────────────────────────────────

export interface MemberFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: MemberStatus;
  membershipTierId?: string;
  tierExpiring?: boolean;
  joinedAfter?: string;
  joinedBefore?: string;
  hasVolunteered?: boolean;
  clubId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
