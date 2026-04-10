import { z } from 'zod';

// ─── Address ──────────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

// ─── Create member ────────────────────────────────────────────────────────────

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: addressSchema.optional(),
  membershipTierId: z.string().uuid('Select a valid tier').optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  sendWelcomeEmail: z.boolean(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

// ─── Update member ────────────────────────────────────────────────────────────

export const updateMemberSchema = createMemberSchema.partial();
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

// ─── Status update ────────────────────────────────────────────────────────────

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ─── Create membership tier ───────────────────────────────────────────────────

export const createTierSchema = z.object({
  name: z.string().min(1, 'Tier name is required').max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').optional(),
  description: z.string().optional(),
  monthlyPriceCents: z.number().int().min(0),
  annualPriceCents: z.number().int().min(0).optional(),
  isFree: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number().int().min(0),
});
export type CreateTierInput = z.infer<typeof createTierSchema>;

export const updateTierSchema = createTierSchema.partial();
export type UpdateTierInput = z.infer<typeof updateTierSchema>;

// ─── Add note ─────────────────────────────────────────────────────────────────

export const addNoteSchema = z.object({
  body: z.string().min(1, 'Note cannot be empty').max(5000),
  isPrivate: z.boolean(),
});
export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ─── Send email ───────────────────────────────────────────────────────────────

export const sendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
});
export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ─── Renew membership ─────────────────────────────────────────────────────────

export const renewMembershipSchema = z.object({
  tierId: z.string().min(1, 'Please select a tier'),
});
export type RenewMembershipInput = z.infer<typeof renewMembershipSchema>;

// ─── Filter members ───────────────────────────────────────────────────────────

export const filterMembersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']).optional(),
  membershipTierId: z.string().uuid().optional(),
  tierExpiring: z.boolean().optional(),
  joinedAfter: z.string().optional(),
  joinedBefore: z.string().optional(),
  hasVolunteered: z.boolean().optional(),
});
export type FilterMembersInput = z.infer<typeof filterMembersSchema>;
