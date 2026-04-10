// ─── Enums mirroring Prisma ──────────────────────────────────────────────────

export type CustomFieldType =
  | 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN'
  | 'SELECT' | 'MULTI_SELECT' | 'URL' | 'PHONE';

export type UserRoleType = 'OWNER' | 'ADMIN' | 'STAFF' | 'READONLY';

export type PlanSlug = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';

// ─── Tenant settings ──────────────────────────────────────────────────────────

export interface TenantSettingsRecord {
  id: string;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  enableMemberships: boolean;
  enableEvents: boolean;
  enableVolunteers: boolean;
  enableClubs: boolean;
  enablePayments: boolean;
  requireEmailVerification: boolean;
  allowPublicMemberDirectory: boolean;
}

export interface FullTenantSettings {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  countryCode: string;
  timezone: string;
  isActive: boolean;
  settings: TenantSettingsRecord | null;
  subscription: TenantSubscription | null;
}

// ─── Plan & subscription ──────────────────────────────────────────────────────

export interface PlanInfo {
  slug: PlanSlug;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
  hasCustomDomain: boolean;
  hasApiAccess: boolean;
  hasAdvancedReports: boolean;
}

export interface TenantSubscription {
  status: string;
  billingInterval: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

// ─── Usage stats ──────────────────────────────────────────────────────────────

export interface UsageStat {
  label: string;
  used: number;
  limit: number | null;
}

export interface UsageStats {
  members: UsageStat;
  users: UsageStat;
  events: UsageStat;
  clubs: UsageStat;
  stats: UsageStat[];
  plan: PlanInfo | null;
  subscription: TenantSubscription | null;
}

// ─── Custom fields ────────────────────────────────────────────────────────────

export interface CustomField {
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

// ─── Team members ─────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRoleType;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ─── Billing history ──────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotalCents: number;
  taxCents: number;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ─── Form input types ────────────────────────────────────────────────────────

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  timezone?: string;
  countryCode?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
}

export interface UpdateBrandingInput {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  domain?: string;
}

export interface UpdatePortalInput {
  enableMemberships?: boolean;
  enableEvents?: boolean;
  enableVolunteers?: boolean;
  enableClubs?: boolean;
  enablePayments?: boolean;
  requireEmailVerification?: boolean;
  allowPublicMemberDirectory?: boolean;
}

export interface UpsertCustomFieldInput {
  name: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  isPublic?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  showInMemberList?: boolean;
}

export interface InviteTeamMemberInput {
  email: string;
  fullName: string;
  role: UserRoleType;
}
