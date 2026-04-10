// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED';
export type EventFormat = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
export type RegistrationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELED'
  | 'ATTENDED'
  | 'NO_SHOW';

// ─── Category ─────────────────────────────────────────────────────────────────

export interface EventCategoryRef {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface EventCategory extends EventCategoryRef {
  createdAt: string;
  _count: { events: number };
}

// ─── Ticket ───────────────────────────────────────────────────────────────────

export interface EventTicket {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  /** Alias for priceCents kept for convenience */
  price: number;
  isFree: boolean;
  capacity: number | null;
  quantity: number | null;
  quantitySold: number;
  salesStart: string | null;
  salesEnd: string | null;
  sortOrder: number;
}

// ─── Speaker ──────────────────────────────────────────────────────────────────

export interface EventSpeaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  avatarUrl: string | null;
  /** Alias for avatarUrl */
  photoUrl: string | null;
  topic: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  sortOrder: number;
}

// ─── Sponsor ──────────────────────────────────────────────────────────────────

export interface EventSponsor {
  id: string;
  name: string;
  tier: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  sortOrder: number;
}

// ─── Event list item (GET /events) ────────────────────────────────────────────

export interface EventListItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  status: EventStatus;
  format: EventFormat;
  location: string | null;
  virtualUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  isPublic: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  category: EventCategoryRef | null;
  _count: {
    registrations: number;
    attendance: number;
    tickets: number;
  };
}

// ─── Event detail (GET /events/:id) ───────────────────────────────────────────

export interface EventDetail extends EventListItem {
  description: string | null;
  isMembersOnly: boolean;
  requiresApproval: boolean;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  createdAt: string;
  updatedAt: string;
  tickets: EventTicket[];
  speakers: EventSpeaker[];
  sponsors: EventSponsor[];
}

// ─── Event location (parsed from JSON `location` field) ───────────────────────

export interface EventLocation {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface EventRegistration {
  id: string;
  tenantId: string;
  eventId: string;
  memberId: string;
  ticketId: string | null;
  status: RegistrationStatus;
  amountCents: number;
  confirmationCode: string | null;
  registeredAt: string;
  canceledAt: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  ticket: { id: string; name: string; priceCents: number } | null;
  attendance: { checkedInAt: string; checkedOutAt: string | null } | null;
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  memberId: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface AttendanceReport {
  totalRegistrations: number;
  totalAttendance: number;
  attendanceRate: string;
  attendees: AttendanceRecord[];
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  position: number;
  joinedAt: string;
  notifiedAt: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  draftEvents: number;
  totalRegistrations: number;
  totalRevenueCents: number;
  averageAttendance: number;
  popularCategories: Array<{ id: string; name: string; eventCount: number }>;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEventItem {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  format: EventFormat;
  startsAt: string;
  endsAt: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  category: EventCategoryRef | null;
  _count: { registrations: number };
}

export interface CalendarView {
  month: number;
  year: number;
  start: string;
  end: string;
  events: CalendarEventItem[];
  byDate: Record<string, CalendarEventItem[]>;
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface QRCodeData {
  confirmationCode: string;
  checkInUrl: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface EventFilters {
  search?: string;
  categoryId?: string;
  status?: EventStatus;
  format?: EventFormat;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
