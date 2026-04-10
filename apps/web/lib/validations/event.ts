import { z } from 'zod';

// ─── Location ─────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string().max(255).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  zipCode: z.string().max(20).optional(),
});

// ─── Ticket ───────────────────────────────────────────────────────────────────

export const ticketSchema = z.object({
  name: z.string().min(1, 'Ticket name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0).optional().default(0),
  isFree: z.boolean().default(true),
  quantity: z.coerce.number().int().min(1).optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  maxPerPerson: z.coerce.number().int().min(1).optional(),
});

export type TicketInput = z.infer<typeof ticketSchema>;

// ─── Speaker ──────────────────────────────────────────────────────────────────

export const speakerSchema = z.object({
  name: z.string().min(1, 'Speaker name is required').max(100),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  topic: z.string().max(255).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
});

export type SpeakerInput = z.infer<typeof speakerSchema>;

// ─── Recurrence ───────────────────────────────────────────────────────────────

const recurrenceSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  interval: z.coerce.number().int().min(1).default(1),
  endDate: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

// ─── Create event ─────────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  // Step 1 — Basic Info
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),

  // Step 2 — Date & Location
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  timezone: z.string().optional(),
  format: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']).default('IN_PERSON'),
  location: locationSchema.optional(),
  virtualLink: z.string().url().optional().or(z.literal('')),
  virtualPlatform: z.string().max(50).optional(),
  recurrence: recurrenceSchema.optional(),

  // Step 3 — Tickets & Capacity
  capacity: z.coerce.number().int().min(1).optional(),
  tickets: z.array(ticketSchema).optional(),

  // Step 4 — Settings
  isPublic: z.boolean().default(true),
  isMembersOnly: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),

  // Step 5 — Speakers
  speakers: z.array(speakerSchema).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ─── Status update ────────────────────────────────────────────────────────────

export const updateEventStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED']),
});
export type UpdateEventStatusInput = z.infer<typeof updateEventStatusSchema>;

// ─── Register member ──────────────────────────────────────────────────────────

export const registerMemberSchema = z.object({
  memberId: z.string().uuid('Select a valid member'),
  ticketId: z.string().uuid().optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(1).default(1),
});
export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;

// ─── Check-in ─────────────────────────────────────────────────────────────────

export const checkInSchema = z.object({
  memberId: z.string().uuid().optional(),
  qrCode: z.string().optional(),
}).refine((d) => d.memberId || d.qrCode, { message: 'Provide a member or QR code' });
export type CheckInInput = z.infer<typeof checkInSchema>;

// ─── Send reminders ───────────────────────────────────────────────────────────

export const sendRemindersSchema = z.object({
  hoursBeforeEvent: z.coerce.number().int().min(1).default(24),
  customMessage: z.string().optional(),
});
export type SendRemindersInput = z.infer<typeof sendRemindersSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color').optional().or(z.literal('')),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
