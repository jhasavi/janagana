'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { createMember } from '@/lib/actions/members'
import { createEvent } from '@/lib/actions/events'
import { recordDonation } from '@/lib/actions/fundraising'

const ContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
})

const CompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(160),
})

const MembershipSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Valid email required'),
})

const EventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(200),
  startDate: z.string().min(1, 'Start date is required'),
})

const DonationSchema = z.object({
  donorName: z.string().min(1, 'Donor name is required').max(120),
  donorEmail: z.string().email('Valid donor email required'),
  amountCents: z.number().int().min(1, 'Amount must be at least 1 cent'),
  campaignId: z.string().optional(),
})

const DealSchema = z.object({
  title: z.string().min(1, 'Deal title is required').max(180),
  contactEmail: z.string().email('Valid contact email required'),
  valueCents: z.number().int().min(0).default(0),
})

const TaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(180),
  contactEmail: z.string().email('Valid contact email required').optional(),
})

export async function quickCreateContact(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = ContactSchema.parse(input)

    const existing = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { emails: { has: data.email } },
          { email: data.email },
        ],
      },
      select: { id: true },
    })

    if (existing) {
      return { success: false, error: 'A contact with this email already exists' }
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        emails: [data.email],
        phone: data.phone || undefined,
        phones: data.phone ? [data.phone] : [],
        source: 'quick_create',
      },
      select: { id: true },
    })

    revalidatePath('/dashboard/crm')
    return { success: true, data: { id: contact.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateContact]', error)
    return { success: false, error: 'Failed to create contact' }
  }
}

export async function quickCreateCompany(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = CompanySchema.parse(input)

    const company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
      },
      select: { id: true },
    })

    revalidatePath('/dashboard/crm/companies')
    return { success: true, data: { id: company.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateCompany]', error)
    return { success: false, error: 'Failed to create company' }
  }
}

export async function quickCreateMembership(input: unknown) {
  try {
    const data = MembershipSchema.parse(input)
    const result = await createMember({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      status: 'ACTIVE',
      smsOptIn: false,
      country: 'US',
    })

    if (!result.success || !result.data?.id) {
      return { success: false, error: result.error ?? 'Failed to create membership' }
    }

    return { success: true, data: { id: result.data.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateMembership]', error)
    return { success: false, error: 'Failed to create membership' }
  }
}

export async function quickCreateEvent(input: unknown) {
  try {
    const data = EventSchema.parse(input)
    const result = await createEvent({
      title: data.title,
      startDate: data.startDate,
      status: 'DRAFT',
      format: 'IN_PERSON',
      priceCents: 0,
      tags: [],
    })

    if (!result.success || !result.data?.id) {
      return { success: false, error: result.error ?? 'Failed to create event' }
    }

    return { success: true, data: { id: result.data.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateEvent]', error)
    return { success: false, error: 'Failed to create event' }
  }
}

export async function quickRecordDonation(input: unknown) {
  try {
    const data = DonationSchema.parse(input)
    const result = await recordDonation({
      donorName: data.donorName,
      donorEmail: data.donorEmail,
      amountCents: data.amountCents,
      campaignId: data.campaignId || undefined,
      isAnonymous: false,
    })

    if (!result.success) {
      return { success: false, error: result.error ?? 'Failed to record donation' }
    }

    return {
      success: true,
      data: { id: result.data?.id ?? null, campaignId: data.campaignId || null },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickRecordDonation]', error)
    return { success: false, error: 'Failed to record donation' }
  }
}

async function ensureContactByEmail(tenantId: string, email: string) {
  const existing = await prisma.contact.findFirst({
    where: {
      tenantId,
      OR: [{ emails: { has: email } }, { email }],
    },
    select: { id: true },
  })

  if (existing) return existing.id

  const localPart = email.split('@')[0] || 'Contact'
  const created = await prisma.contact.create({
    data: {
      tenantId,
      firstName: localPart,
      lastName: '',
      email,
      emails: [email],
      source: 'quick_create',
    },
    select: { id: true },
  })

  return created.id
}

export async function quickCreateDeal(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = DealSchema.parse(input)

    const contactId = await ensureContactByEmail(tenant.id, data.contactEmail)

    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        contactId,
        title: data.title,
        valueCents: data.valueCents,
        stage: 'LEAD',
      },
      select: { id: true },
    })

    revalidatePath('/dashboard/crm/deals')
    return { success: true, data: { id: deal.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateDeal]', error)
    return { success: false, error: 'Failed to create deal' }
  }
}

export async function quickCreateTask(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = TaskSchema.parse(input)

    const contactId = data.contactEmail
      ? await ensureContactByEmail(tenant.id, data.contactEmail)
      : null

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        contactId,
        title: data.title,
        status: 'TODO',
        priority: 'MEDIUM',
      },
      select: { id: true },
    })

    revalidatePath('/dashboard/crm/tasks')
    return { success: true, data: { id: task.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[quickCreateTask]', error)
    return { success: false, error: 'Failed to create task' }
  }
}
