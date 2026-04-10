import { z } from 'zod';

// ─── Social links ─────────────────────────────────────────────────────────────

const socialLinksSchema = z.object({
  website: z.string().max(255).optional().or(z.literal('')),
  facebook: z.string().max(255).optional().or(z.literal('')),
  instagram: z.string().max(255).optional().or(z.literal('')),
  twitter: z.string().max(255).optional().or(z.literal('')),
});

// ─── Create Club ─────────────────────────────────────────────────────────────

export const createClubSchema = z.object({
  name: z.string().min(2, 'Club name must be at least 2 characters').max(100),
  description: z.string().max(5000).optional(),
  category: z.enum(['INTEREST', 'PROFESSIONAL', 'SOCIAL', 'SPORTS', 'OTHER']).optional(),
  coverImageUrl: z.string().url('Enter a valid URL').max(500).optional().or(z.literal('')),
  logoUrl: z.string().url('Enter a valid URL').max(500).optional().or(z.literal('')),
  isPublic: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  maxMembers: z.coerce.number().int().min(1).max(10000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  socialLinks: socialLinksSchema.optional(),
  meetingSchedule: z.string().max(500).optional(),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = Partial<CreateClubInput>;

// ─── Create Post ─────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, 'Post content is required').max(50000),
  isPinned: z.boolean().default(false),
  notifyMembers: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ─── Create Comment ───────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ─── Invite Member ────────────────────────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email address').max(255),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
