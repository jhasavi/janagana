// ─── Enums ────────────────────────────────────────────────────────────────────

export type ClubVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type ClubRoleType = 'LEADER' | 'CO_LEADER' | 'MEMBER';
export type ClubCategory = 'INTEREST' | 'PROFESSIONAL' | 'SOCIAL' | 'SPORTS' | 'OTHER';

// ─── Member (embedded) ────────────────────────────────────────────────────────

export interface ClubMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

// ─── Membership ───────────────────────────────────────────────────────────────

export interface ClubMembershipItem {
  id: string;
  clubId: string;
  memberId: string;
  member: ClubMemberSummary;
  role: ClubRoleType;
  joinedAt: string;
  createdAt: string;
}

// ─── Club ─────────────────────────────────────────────────────────────────────

export interface ClubCount {
  memberships: number;
  posts: number;
  events: number;
}

export interface ClubListItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  visibility: ClubVisibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: ClubCount;
}

export interface ClubDetail extends ClubListItem {
  memberships: ClubMembershipItem[];
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface ClubPostCount {
  comments: number;
}

export interface ClubPost {
  id: string;
  tenantId: string;
  clubId: string;
  authorId: string;
  title?: string | null;
  body: string;
  isPinned: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: ClubPostCount;
}

export interface ClubPostComment {
  id: string;
  tenantId: string;
  postId: string;
  memberId: string;
  member: ClubMemberSummary;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface ClubEventSummary {
  id: string;
  title: string;
  slug: string;
  startsAt?: string | null;
  endsAt?: string | null;
  status: string;
}

export interface ClubEventLink {
  id: string;
  clubId: string;
  eventId: string;
  createdAt: string;
  event?: ClubEventSummary;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface ClubStats {
  totalClubs: number;
  activeClubs: number;
  totalMembers: number;
  postsThisMonth: number;
}

export interface ClubDetailStats {
  memberCount: number;
  postCount: number;
  eventCount: number;
  membersThisMonth: number;
  /** Aliases used by dashboard admin page */
  memberships: number;
  posts: number;
  comments: number;
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

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface ClubFilters {
  search?: string;
  isActive?: boolean;
  myClubs?: boolean;
  page?: number;
  limit?: number;
}
