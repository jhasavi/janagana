'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantActionAccess } from '@/lib/actions/permissions'
import { prisma } from '@/lib/prisma'

const blankToNull = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const optionalText = z.preprocess(blankToNull, z.string().nullable().optional())
const optionalUrl = z.preprocess(blankToNull, z.string().url().nullable().optional())
const optionalId = z.preprocess(blankToNull, z.string().min(1).nullable().optional())

const contactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: optionalText,
  jobTitle: optionalText,
  linkedinUrl: optionalUrl,
  companyName: optionalText,
  source: optionalText,
  notes: optionalText,
})

const companySchema = z.object({
  name: z.string().trim().min(1),
  industry: optionalText,
  website: optionalUrl,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  postalCode: optionalText,
  country: optionalText,
  description: optionalText,
})

const dealSchema = z.object({
  contactId: z.string().trim().min(1),
  companyId: optionalId,
  title: z.string().trim().min(1),
  description: optionalText,
  valueCents: z.number().min(0),
  currency: z.string().trim().min(1).default('USD'),
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('LEAD'),
  probability: z.number().min(0).max(100).default(0),
  expectedCloseDate: optionalText,
  source: optionalText,
})

const taskSchema = z.object({
  contactId: optionalId,
  dealId: optionalId,
  title: z.string().trim().min(1),
  description: optionalText,
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: optionalText,
})

const activitySchema = z.object({
  contactId: optionalId,
  dealId: optionalId,
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'OTHER']),
  title: z.string().trim().min(1),
  description: optionalText,
  direction: optionalText,
  duration: z.number().nullable().optional(),
  location: optionalText,
})

const searchQuerySchema = z.string().min(1)

type ActionResult<T = undefined> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>

async function requireCRMAccess(actionName: string) {
  const access = await requireTenantActionAccess(actionName, 'crm_manage')
  if (!access.success) {
    return { ok: false as const, error: access.error }
  }
  return { ok: true as const, tenant: access.tenant }
}

function revalidateCRM(...paths: string[]) {
  revalidatePath('/dashboard/crm')
  for (const path of paths) {
    revalidatePath(path)
  }
}

function compactPaths(...paths: Array<string | null | undefined>) {
  return Array.from(new Set(paths.filter((path): path is string => Boolean(path))))
}

function contactPath(contactId?: string | null) {
  return contactId ? `/dashboard/crm/contacts/${contactId}` : null
}

function companyPath(companyId?: string | null) {
  return companyId ? `/dashboard/crm/companies/${companyId}` : null
}

function dealPath(dealId?: string | null) {
  return dealId ? `/dashboard/crm/deals/${dealId}` : null
}

export async function createContactAction(input: unknown): ActionResult<unknown> {
  try {
    const values = contactSchema.parse(input)
    const access = await requireCRMAccess('createContactAction')
    if (!access.ok) return { success: false, error: access.error }

    const contact = await prisma.contact.create({
      data: {
        tenantId: access.tenant.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        emails: [values.email],
        phone: values.phone ?? undefined,
        phones: values.phone ? [values.phone] : [],
        jobTitle: values.jobTitle ?? undefined,
        linkedinUrl: values.linkedinUrl ?? undefined,
        companyName: values.companyName ?? undefined,
        source: values.source ?? undefined,
        notes: values.notes ?? undefined,
      },
    })

    revalidateCRM()
    return { success: true, data: contact }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to create contact' }
  }
}

export async function updateContactAction(contactId: string, input: unknown): ActionResult<unknown> {
  try {
    const values = contactSchema.parse(input)
    const access = await requireCRMAccess('updateContactAction')
    if (!access.ok) return { success: false, error: access.error }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: access.tenant.id },
    })
    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    if (values.email !== contact.email) {
      const duplicate = await prisma.contact.findFirst({
        where: { tenantId: access.tenant.id, email: values.email, id: { not: contactId } },
      })
      if (duplicate) {
        return { success: false, error: 'Contact with this email already exists' }
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        emails: [values.email],
        phone: values.phone ?? null,
        phones: values.phone ? [values.phone] : [],
        jobTitle: values.jobTitle ?? null,
        linkedinUrl: values.linkedinUrl ?? null,
        companyName: values.companyName ?? null,
        source: values.source ?? null,
        notes: values.notes ?? null,
      },
    })

    revalidateCRM(`/dashboard/crm/contacts/${contactId}`)
    return { success: true, data: updatedContact }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to update contact' }
  }
}

export async function archiveContactAction(contactId: string): ActionResult<undefined> {
  try {
    const access = await requireCRMAccess('archiveContactAction')
    if (!access.ok) return { success: false, error: access.error }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: access.tenant.id },
    })
    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    const tags = Array.from(new Set([...(contact.tags ?? []), '__system_archived']))
    await prisma.contact.update({
      where: { id: contactId },
      data: { tags },
    })

    revalidateCRM(`/dashboard/crm/contacts/${contactId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Failed to archive contact' }
  }
}

export async function createCompanyAction(input: unknown): ActionResult<unknown> {
  try {
    const values = companySchema.parse(input)
    const access = await requireCRMAccess('createCompanyAction')
    if (!access.ok) return { success: false, error: access.error }

    const company = await prisma.company.create({
      data: {
        tenantId: access.tenant.id,
        name: values.name,
        industry: values.industry ?? null,
        website: values.website ?? null,
        address: values.address ?? null,
        city: values.city ?? null,
        state: values.state ?? null,
        postalCode: values.postalCode ?? null,
        country: values.country ?? null,
        description: values.description ?? null,
      },
    })

    revalidateCRM('/dashboard/crm/companies')
    return { success: true, data: company }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to create company' }
  }
}

export async function updateCompanyAction(companyId: string, input: unknown): ActionResult<unknown> {
  try {
    const values = companySchema.parse(input)
    const access = await requireCRMAccess('updateCompanyAction')
    if (!access.ok) return { success: false, error: access.error }

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId: access.tenant.id },
    })
    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: values.name,
        industry: values.industry ?? undefined,
        website: values.website ?? undefined,
        address: values.address ?? undefined,
        city: values.city ?? undefined,
        state: values.state ?? undefined,
        postalCode: values.postalCode ?? undefined,
        country: values.country ?? undefined,
        description: values.description ?? undefined,
      },
    })

    revalidateCRM('/dashboard/crm/companies', `/dashboard/crm/companies/${companyId}`)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to update company' }
  }
}

export async function deleteCompanyAction(companyId: string): ActionResult<undefined> {
  try {
    const access = await requireCRMAccess('deleteCompanyAction')
    if (!access.ok) return { success: false, error: access.error }

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId: access.tenant.id },
    })
    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    await prisma.company.delete({ where: { id: companyId } })
    revalidateCRM('/dashboard/crm/companies', `/dashboard/crm/companies/${companyId}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Failed to delete company' }
  }
}

export async function createDealAction(input: unknown): ActionResult<unknown> {
  try {
    const values = dealSchema.parse(input)
    const access = await requireCRMAccess('createDealAction')
    if (!access.ok) return { success: false, error: access.error }

    const contact = await prisma.contact.findFirst({
      where: { id: values.contactId, tenantId: access.tenant.id },
    })
    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    if (values.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: values.companyId, tenantId: access.tenant.id },
      })
      if (!company) {
        return { success: false, error: 'Company not found' }
      }
    }

    const deal = await prisma.deal.create({
      data: {
        tenantId: access.tenant.id,
        contactId: values.contactId,
        companyId: values.companyId ?? undefined,
        title: values.title,
        description: values.description ?? undefined,
        valueCents: values.valueCents,
        currency: values.currency,
        stage: values.stage,
        probability: values.probability,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate) : null,
        source: values.source ?? undefined,
      },
    })

    revalidateCRM(...compactPaths('/dashboard/crm/deals', contactPath(values.contactId), companyPath(values.companyId)))
    return { success: true, data: deal }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to create deal' }
  }
}

export async function updateDealAction(dealId: string, input: unknown): ActionResult<unknown> {
  try {
    const values = dealSchema.parse(input)
    const access = await requireCRMAccess('updateDealAction')
    if (!access.ok) return { success: false, error: access.error }

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tenantId: access.tenant.id },
    })
    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    if (values.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: values.contactId, tenantId: access.tenant.id },
      })
      if (!contact) {
        return { success: false, error: 'Contact not found' }
      }
    }

    if (values.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: values.companyId, tenantId: access.tenant.id },
      })
      if (!company) {
        return { success: false, error: 'Company not found' }
      }
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        contactId: values.contactId,
        companyId: values.companyId ?? null,
        title: values.title,
        description: values.description ?? null,
        valueCents: values.valueCents,
        currency: values.currency,
        stage: values.stage,
        probability: values.probability,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate) : null,
        source: values.source ?? null,
      },
    })

    revalidateCRM(
      ...compactPaths(
        '/dashboard/crm/deals',
        dealPath(dealId),
        contactPath(deal.contactId),
        contactPath(values.contactId),
        companyPath(deal.companyId),
        companyPath(values.companyId)
      )
    )
    return { success: true, data: updatedDeal }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to update deal' }
  }
}

export async function deleteDealAction(dealId: string): ActionResult<undefined> {
  try {
    const access = await requireCRMAccess('deleteDealAction')
    if (!access.ok) return { success: false, error: access.error }

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tenantId: access.tenant.id },
    })
    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    await prisma.deal.delete({ where: { id: dealId } })
    revalidateCRM(
      ...compactPaths('/dashboard/crm/deals', dealPath(dealId), contactPath(deal.contactId), companyPath(deal.companyId))
    )
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Failed to delete deal' }
  }
}

export async function createTaskAction(input: unknown): ActionResult<unknown> {
  try {
    const values = taskSchema.parse(input)
    const access = await requireCRMAccess('createTaskAction')
    if (!access.ok) return { success: false, error: access.error }

    if (values.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: values.contactId, tenantId: access.tenant.id },
      })
      if (!contact) {
        return { success: false, error: 'Contact not found' }
      }
    }

    if (values.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: values.dealId, tenantId: access.tenant.id },
      })
      if (!deal) {
        return { success: false, error: 'Deal not found' }
      }
    }

    const task = await prisma.task.create({
      data: {
        tenantId: access.tenant.id,
        contactId: values.contactId ?? undefined,
        dealId: values.dealId ?? undefined,
        title: values.title,
        description: values.description ?? undefined,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate) : null,
      },
    })

    revalidateCRM(...compactPaths('/dashboard/crm/tasks', contactPath(values.contactId), dealPath(values.dealId)))
    return { success: true, data: task }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to create task' }
  }
}

export async function updateTaskAction(taskId: string, input: unknown): ActionResult<unknown> {
  try {
    const values = taskSchema.parse(input)
    const access = await requireCRMAccess('updateTaskAction')
    if (!access.ok) return { success: false, error: access.error }

    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId: access.tenant.id },
    })
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (values.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: values.contactId, tenantId: access.tenant.id },
      })
      if (!contact) {
        return { success: false, error: 'Contact not found' }
      }
    }

    if (values.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: values.dealId, tenantId: access.tenant.id },
      })
      if (!deal) {
        return { success: false, error: 'Deal not found' }
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        contactId: values.contactId ?? null,
        dealId: values.dealId ?? null,
        title: values.title,
        description: values.description ?? null,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate) : null,
      },
    })

    revalidateCRM(
      ...compactPaths(
        '/dashboard/crm/tasks',
        `/dashboard/crm/tasks/${taskId}`,
        contactPath(task.contactId),
        contactPath(values.contactId),
        dealPath(task.dealId),
        dealPath(values.dealId)
      )
    )
    return { success: true, data: updatedTask }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to update task' }
  }
}

export async function deleteTaskAction(taskId: string): ActionResult<undefined> {
  try {
    const access = await requireCRMAccess('deleteTaskAction')
    if (!access.ok) return { success: false, error: access.error }

    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId: access.tenant.id },
    })
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await prisma.task.delete({ where: { id: taskId } })
    revalidateCRM(
      ...compactPaths('/dashboard/crm/tasks', `/dashboard/crm/tasks/${taskId}`, contactPath(task.contactId), dealPath(task.dealId))
    )
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Failed to delete task' }
  }
}

export async function createActivityAction(input: unknown): ActionResult<unknown> {
  try {
    const values = activitySchema.parse(input)
    const access = await requireCRMAccess('createActivityAction')
    if (!access.ok) return { success: false, error: access.error }

    if (values.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: values.contactId, tenantId: access.tenant.id },
      })
      if (!contact) {
        return { success: false, error: 'Contact not found' }
      }
    }

    if (values.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: values.dealId, tenantId: access.tenant.id },
      })
      if (!deal) {
        return { success: false, error: 'Deal not found' }
      }
    }

    const activity = await prisma.activity.create({
      data: {
        tenantId: access.tenant.id,
        contactId: values.contactId ?? undefined,
        dealId: values.dealId ?? undefined,
        type: values.type,
        title: values.title,
        description: values.description ?? undefined,
        direction: values.direction ?? undefined,
        duration: values.duration ?? undefined,
        location: values.location ?? undefined,
      },
    })

    revalidateCRM(...compactPaths(contactPath(values.contactId), dealPath(values.dealId)))
    return { success: true, data: activity }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to create activity' }
  }
}

export async function searchContactsAction(query: string): ActionResult<unknown> {
  try {
    const cleaned = searchQuerySchema.parse(query.trim())
    const access = await requireCRMAccess('searchContactsAction')
    if (!access.ok) return { success: false, error: access.error }

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: access.tenant.id,
        OR: [
          { firstName: { contains: cleaned, mode: 'insensitive' } },
          { lastName: { contains: cleaned, mode: 'insensitive' } },
          { email: { contains: cleaned, mode: 'insensitive' } },
          { emails: { has: cleaned.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        linkedinUrl: true,
        companyName: true,
        source: true,
        notes: true,
      },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return { success: true, data: contacts }
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors[0]?.message ?? 'Invalid input' : 'Failed to search contacts' }
  }
}
