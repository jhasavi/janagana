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

// ─── Application question ────────────────────────────────────────────────────

const applicationQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  type: z.enum(['text', 'textarea', 'select', 'checkbox']),
  required: z.boolean().default(false),
  options: z.array(z.string().max(100)).optional(),
});

export type ApplicationQuestionInput = z.infer<typeof applicationQuestionSchema>;

// ─── Shift ────────────────────────────────────────────────────────────────────

export const shiftSchema = z.object({
  shiftName: z.string().min(1, 'Shift name is required').max(200),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  volunteersNeeded: z.coerce.number().int().min(1).optional(),
  description: z.string().max(500).optional(),
  location: locationSchema.optional(),
});

export type ShiftInput = z.infer<typeof shiftSchema>;

// ─── Create Opportunity ───────────────────────────────────────────────────────

export const createOpportunitySchema = z.object({
  // Step 1: Basic Details
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['FUNDRAISING', 'EVENTS', 'ADMIN', 'OUTREACH', 'EDUCATION', 'OTHER']).optional(),
  commitment: z.enum(['ONE_TIME', 'RECURRING', 'ONGOING']).optional(),
  requiredSkills: z.array(z.string().max(100)).optional().default([]),
  preferredSkills: z.array(z.string().max(100)).optional().default([]),
  isMembersOnly: z.boolean().default(false),

  // Step 2: Schedule
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isVirtual: z.boolean().default(false),
  location: locationSchema.optional(),
  shifts: z.array(shiftSchema).optional().default([]),

  // Step 3: Application Settings
  applicationDeadline: z.string().optional(),
  applicationQuestions: z.array(applicationQuestionSchema).optional().default([]),
  minimumAge: z.coerce.number().int().min(0).optional(),
  hoursPerShift: z.coerce.number().positive().optional(),
  totalVolunteersNeeded: z.coerce.number().int().min(1).optional(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

// ─── Update Opportunity ───────────────────────────────────────────────────────

export const updateOpportunitySchema = createOpportunitySchema.partial();
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

// ─── Add Shift ────────────────────────────────────────────────────────────────

export const addShiftSchema = z.object({
  shiftName: z.string().min(1, 'Shift name is required').max(200),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  capacity: z.coerce.number().int().min(1).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(500).optional(),
});

export type AddShiftInput = z.infer<typeof addShiftSchema>;

// ─── Submit Application ───────────────────────────────────────────────────────

const applicationAnswerSchema = z.object({
  question: z.string().max(500),
  answer: z.string().max(2000),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(30),
});

export const submitApplicationSchema = z.object({
  opportunityId: z.string().uuid(),
  memberId: z.string().uuid(),
  shiftIds: z.array(z.string().uuid()).optional().default([]),
  motivation: z.string().max(2000).optional(),
  experience: z.string().max(2000).optional(),
  availability: z.string().max(1000).optional(),
  answers: z.array(applicationAnswerSchema).optional().default([]),
  emergencyContact: emergencyContactSchema.optional(),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

// ─── Review Application ───────────────────────────────────────────────────────

export const reviewApplicationSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  notes: z.string().max(1000).optional(),
});

export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

// ─── Log Hours ────────────────────────────────────────────────────────────────

export const logHoursSchema = z.object({
  memberId: z.string().uuid('Invalid member'),
  opportunityId: z.string().uuid('Invalid opportunity'),
  shiftId: z.string().uuid().optional(),
  date: z.string().min(1, 'Date is required'),
  hoursWorked: z.coerce.number().positive('Hours must be positive').max(24, 'Max 24 hours per entry'),
  description: z.string().max(1000).optional(),
  approvedByUserId: z.string().uuid().optional(),
});

export type LogHoursInput = z.infer<typeof logHoursSchema>;

// ─── Reject Hours ─────────────────────────────────────────────────────────────

export const rejectHoursSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type RejectHoursInput = z.infer<typeof rejectHoursSchema>;
