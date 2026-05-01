'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { sendEventReminder } from '@/lib/sms'
import { ensureContactForMember } from '@/lib/contact-linking'
import { uploadFile } from '@/lib/upload'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const EventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  location: z.string().optional(),  speakerName: z.string().optional(),
  attendeeCount: z.coerce.number().int().min(0).optional().nullable(),  virtualLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  capacity: z.number().int().positive().optional().nullable(),
  priceCents: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED']).default('DRAFT'),
  format: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']).default('IN_PERSON'),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
})

// ─── EVENT ACTIONS ────────────────────────────────────────────────────────────

export async function getEvents(params?: {
  search?: string
  status?: string
  upcoming?: boolean
}) {
  try {
    const tenant = await requireTenant()

    const where: Record<string, unknown> = { tenantId: tenant.id }

    if (params?.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params?.upcoming) {
      where.startDate = { gte: new Date() }
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        _count: { select: { registrations: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return { success: true, data: events }
  } catch (error) {
    console.error('[getEvents]', error)
    return { success: false, error: 'Failed to load events', data: [] }
  }
}

export async function getEvent(id: string) {
  try {
    const tenant = await requireTenant()

    const event = await prisma.event.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        registrations: {
          include: { member: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { registrations: true } },
      },
    })

    if (!event) return { success: false, error: 'Event not found', data: null }
    return { success: true, data: event }
  } catch (error) {
    console.error('[getEvent]', error)
    return { success: false, error: 'Failed to load event', data: null }
  }
}

export async function createEvent(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = EventSchema.parse(input)

    const event = await prisma.event.create({
      data: {
        ...data,
        tenantId: tenant.id,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ?? null,
        attendeeCount: data.attendeeCount ?? null,
        speakerName: data.speakerName || null,
        coverImageUrl: data.coverImageUrl || null,
        virtualLink: data.virtualLink || null,
      },
    })

    revalidatePath('/dashboard/events')
    return { success: true, data: event }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[createEvent]', error)
    return { success: false, error: 'Failed to create event' }
  }
}

export async function updateEvent(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = EventSchema.parse(input)

    const event = await prisma.event.update({
      where: { id, tenantId: tenant.id },
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ?? null,
        attendeeCount: data.attendeeCount ?? null,
        speakerName: data.speakerName || null,
        coverImageUrl: data.coverImageUrl || null,
        virtualLink: data.virtualLink || null,
      },
    })

    revalidatePath('/dashboard/events')
    revalidatePath(`/dashboard/events/${id}`)
    return { success: true, data: event }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[updateEvent]', error)
    return { success: false, error: 'Failed to update event' }
  }
}

export async function uploadEventCoverImage(formData: FormData) {
  try {
    await requireTenant()

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No file provided' }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }
    }
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Image is too large. Maximum size is 10 MB.' }
    }

    const uploaded = await uploadFile(file, 'janagana/events')
    return { success: true, url: uploaded.secure_url }
  } catch (e) {
    console.error('[uploadEventCoverImage]', e)
    return { success: false, error: 'Failed to upload image' }
  }
}

export async function deleteEvent(id: string) {
  try {
    const tenant = await requireTenant()

    await prisma.event.delete({ where: { id, tenantId: tenant.id } })

    revalidatePath('/dashboard/events')
    return { success: true }
  } catch (error) {
    console.error('[deleteEvent]', error)
    return { success: false, error: 'Failed to delete event' }
  }
}

export async function publishEvent(id: string) {
  try {
    const tenant = await requireTenant()

    const event = await prisma.event.update({
      where: { id, tenantId: tenant.id },
      data: { status: 'PUBLISHED' },
    })

    revalidatePath('/dashboard/events')
    revalidatePath(`/dashboard/events/${id}`)
    return { success: true, data: event }
  } catch (error) {
    console.error('[publishEvent]', error)
    return { success: false, error: 'Failed to publish event' }
  }
}

// ─── REGISTRATION ACTIONS ────────────────────────────────────────────────────

export async function registerMemberForEvent(eventId: string, memberId: string) {
  try {
    const tenant = await requireTenant()

    // Verify both belong to tenant
    const [event, member] = await Promise.all([
      prisma.event.findFirst({ where: { id: eventId, tenantId: tenant.id } }),
      prisma.member.findFirst({ where: { id: memberId, tenantId: tenant.id } }),
    ])

    if (!event) return { success: false, error: 'Event not found' }
    if (!member) return { success: false, error: 'Member not found' }

    const contact = await ensureContactForMember({
      id: member.id,
      tenantId: member.tenantId,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      address: member.address,
      city: member.city,
      state: member.state,
      postalCode: member.postalCode,
      country: member.country,
    })

    // Check capacity
    if (event.capacity) {
      const count = await prisma.eventRegistration.count({
        where: { eventId, status: { in: ['CONFIRMED', 'ATTENDED'] } },
      })
      if (count >= event.capacity) {
        return { success: false, error: 'Event is at full capacity' }
      }
    }

    const registration = await prisma.eventRegistration.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      create: { eventId, memberId, contactId: contact.id, status: 'CONFIRMED' },
      update: { status: 'CONFIRMED', contactId: contact.id },
    })

    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, data: registration }
  } catch (error) {
    console.error('[registerMemberForEvent]', error)
    return { success: false, error: 'Failed to register member' }
  }
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: 'CONFIRMED' | 'CANCELED' | 'ATTENDED' | 'NO_SHOW'
) {
  try {
    const tenant = await requireTenant()

    const reg = await prisma.eventRegistration.findFirst({
      where: { id: registrationId },
      include: { event: true },
    })

    if (!reg || reg.event.tenantId !== tenant.id) {
      return { success: false, error: 'Registration not found' }
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status },
    })

    revalidatePath(`/dashboard/events/${reg.eventId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('[updateRegistrationStatus]', error)
    return { success: false, error: 'Failed to update registration' }
  }
}

// ─── SMS REMINDERS ───────────────────────────────────────────────────────────

/**
 * Send SMS reminders to all registered (CONFIRMED) members for an event.
 * No-op if Twilio is not configured. Returns counts of sent/skipped.
 */
export async function sendEventSmsReminders(eventId: string) {
  try {
    const tenant = await requireTenant()
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: tenant.id },
      select: { id: true, title: true, startDate: true, location: true },
    })
    if (!event) return { success: false, error: 'Event not found' }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { member: { select: { phone: true, firstName: true } } },
    })

    let sent = 0
    let skipped = 0
    for (const reg of registrations) {
      if (!reg.member.phone) { skipped++; continue }
      const result = await sendEventReminder({
        phone: reg.member.phone,
        firstName: reg.member.firstName,
        eventTitle: event.title,
        eventDate: event.startDate,
      })
      if (result) sent++
      else skipped++
    }

    return { success: true, data: { sent, skipped } }
  } catch (error) {
    console.error('[sendEventSmsReminders]', error)
    return { success: false, error: 'Failed to send reminders' }
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getEventStats() {
  try {
    const tenant = await requireTenant()
    const now = new Date()

    const [total, upcoming, published] = await Promise.all([
      prisma.event.count({ where: { tenantId: tenant.id } }),
      prisma.event.count({
        where: { tenantId: tenant.id, startDate: { gte: now }, status: 'PUBLISHED' },
      }),
      prisma.event.count({ where: { tenantId: tenant.id, status: 'PUBLISHED' } }),
    ])

    return { success: true, data: { total, upcoming, published } }
  } catch (error) {
    console.error('[getEventStats]', error)
    return { success: false, error: 'Failed to load stats', data: null }
  }
}
