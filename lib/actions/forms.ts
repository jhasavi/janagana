'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { slugify } from '@/lib/utils'

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  isPublished: z.boolean().default(false),
  requiresAuth: z.boolean().default(false),
  confirmationMessage: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  maxSubmissions: z.number().int().min(1).optional().nullable(),
})

const FieldSchema = z.object({
  fieldType: z.enum(['TEXT','TEXTAREA','EMAIL','PHONE','NUMBER','DATE','SELECT','CHECKBOX','RADIO','FILE','HEADING','PARAGRAPH']),
  label: z.string().min(1, 'Label is required').max(200),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
  content: z.string().optional(),
})

// ─── FORM ACTIONS ─────────────────────────────────────────────────────────────

export async function getForms() {
  try {
    const tenant = await requireTenant()
    const forms = await prisma.customForm.findMany({
      where: { tenantId: tenant.id, isArchived: false },
      include: { _count: { select: { submissions: true, fields: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: forms }
  } catch (error) {
    console.error('[getForms]', error)
    return { success: false, error: 'Failed to load forms', data: [] }
  }
}

export async function getForm(id: string) {
  try {
    const tenant = await requireTenant()
    const form = await prisma.customForm.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { submissions: true } },
      },
    })
    if (!form) return { success: false, error: 'Form not found', data: null }
    return { success: true, data: form }
  } catch (error) {
    console.error('[getForm]', error)
    return { success: false, error: 'Failed to load form', data: null }
  }
}

export async function getPublicForm(tenantId: string, slug: string) {
  try {
    const form = await prisma.customForm.findUnique({
      where: { tenantId_slug: { tenantId, slug }, isPublished: true },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!form) return { success: false, error: 'Form not found', data: null }
    return { success: true, data: form }
  } catch (error) {
    console.error('[getPublicForm]', error)
    return { success: false, error: 'Failed to load form', data: null }
  }
}

export async function createForm(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = FormSchema.parse(input)

    const baseSlug = slugify(data.title as string)
    let slug = baseSlug
    let attempt = 0
    while (await prisma.customForm.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const form = await prisma.customForm.create({
      data: {
        tenantId: tenant.id,
        slug,
        title: data.title,
        description: data.description,
        isPublished: data.isPublished,
        requiresAuth: data.requiresAuth,
        confirmationMessage: data.confirmationMessage,
        redirectUrl: data.redirectUrl || null,
        maxSubmissions: data.maxSubmissions ?? null,
      },
    })

    revalidatePath('/dashboard/forms')
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[createForm]', error)
    return { success: false, error: 'Failed to create form' }
  }
}

export async function updateForm(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = FormSchema.parse(input)

    const existing = await prisma.customForm.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Form not found' }

    const form = await prisma.customForm.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isPublished: data.isPublished,
        requiresAuth: data.requiresAuth,
        confirmationMessage: data.confirmationMessage,
        redirectUrl: data.redirectUrl || null,
        maxSubmissions: data.maxSubmissions ?? null,
      },
    })

    revalidatePath('/dashboard/forms')
    revalidatePath(`/dashboard/forms/${id}`)
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[updateForm]', error)
    return { success: false, error: 'Failed to update form' }
  }
}

export async function deleteForm(id: string) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.customForm.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Form not found' }

    await prisma.customForm.delete({ where: { id } })
    revalidatePath('/dashboard/forms')
    return { success: true }
  } catch (error) {
    console.error('[deleteForm]', error)
    return { success: false, error: 'Failed to delete form' }
  }
}

// ─── FIELD ACTIONS ────────────────────────────────────────────────────────────

export async function saveFormFields(formId: string, fields: unknown[]) {
  try {
    const tenant = await requireTenant()
    const form = await prisma.customForm.findFirst({ where: { id: formId, tenantId: tenant.id } })
    if (!form) return { success: false, error: 'Form not found' }

    const parsed = z.array(FieldSchema.extend({ id: z.string().optional() })).parse(fields)

    await prisma.$transaction(async (tx) => {
      // Delete removed fields (keep only IDs present in the new list)
      const keepIds = parsed.filter((f) => f.id).map((f) => f.id as string)
      await tx.formField.deleteMany({
        where: { formId, NOT: keepIds.length ? { id: { in: keepIds } } : undefined },
      })

      for (const [index, field] of parsed.entries()) {
        const baseKey = slugify(field.label).replace(/-/g, '_') || `field_${index}`
        const fieldKey = field.id ? undefined : baseKey

        if (field.id) {
          await tx.formField.update({
            where: { id: field.id },
            data: {
              fieldType: field.fieldType,
              label: field.label,
              placeholder: field.placeholder,
              helpText: field.helpText,
              isRequired: field.isRequired,
              options: field.options,
              sortOrder: index,
              content: field.content,
            },
          })
        } else {
          // Ensure unique fieldKey within form
          let key = fieldKey!
          let attempt = 0
          while (await tx.formField.findUnique({ where: { formId_fieldKey: { formId, fieldKey: key } } })) {
            attempt++
            key = `${fieldKey}_${attempt}`
          }
          await tx.formField.create({
            data: {
              formId,
              fieldType: field.fieldType,
              label: field.label,
              fieldKey: key,
              placeholder: field.placeholder,
              helpText: field.helpText,
              isRequired: field.isRequired,
              options: field.options,
              sortOrder: index,
              content: field.content,
            },
          })
        }
      }
    })

    revalidatePath(`/dashboard/forms/${formId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[saveFormFields]', error)
    return { success: false, error: 'Failed to save fields' }
  }
}

// ─── SUBMISSION ACTIONS ───────────────────────────────────────────────────────

export async function submitForm(formId: string, data: Record<string, unknown>, meta: { email?: string; name?: string }) {
  try {
    const form = await prisma.customForm.findUnique({
      where: { id: formId },
      include: { fields: true },
    })
    if (!form || !form.isPublished) return { success: false, error: 'Form not available' }

    // Check max submissions
    if (form.maxSubmissions) {
      const count = await prisma.formSubmission.count({ where: { formId } })
      if (count >= form.maxSubmissions) return { success: false, error: 'This form is no longer accepting submissions' }
    }

    // Validate required fields (server-side enforcement)
    for (const field of form.fields) {
      if (field.isRequired && field.fieldType !== 'HEADING' && field.fieldType !== 'PARAGRAPH') {
        const val = data[field.fieldKey]
        if (!val || (typeof val === 'string' && !val.trim())) {
          return { success: false, error: `${field.label} is required` }
        }
      }
    }

    const rawEmail = (meta.email ?? (typeof data.email === 'string' ? data.email : '')).trim().toLowerCase()
    const rawPhone = typeof data.phone === 'string' ? data.phone.trim() : undefined
    const rawName = (meta.name ?? (typeof data.name === 'string' ? data.name : '')).trim()

    if (rawEmail) {
      const [firstName, ...rest] = rawName ? rawName.split(' ') : ['Form', 'Submitter']
      const lastName = rest.join(' ') || 'Submitter'

      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId: form.tenantId,
          OR: [{ email: rawEmail }, { emails: { has: rawEmail } }],
        },
      })

      if (existingContact) {
        await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            emails: Array.from(new Set([...(existingContact.emails ?? []), rawEmail])),
            phones: Array.from(
              new Set([...(existingContact.phones ?? []), rawPhone].filter(Boolean))
            ) as string[],
            notes: [
              existingContact.notes,
              `Form submission: ${form.title} (${new Date().toISOString()})`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        })
      } else {
        await prisma.contact.create({
          data: {
            tenantId: form.tenantId,
            firstName,
            lastName,
            email: rawEmail,
            emails: [rawEmail],
            phones: rawPhone ? [rawPhone] : [],
            source: 'form_submission',
            notes: `Form submission: ${form.title}`,
          },
        })
      }
    }

    await prisma.formSubmission.create({
      data: {
        formId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        submitterEmail: meta.email,
        submitterName: meta.name,
      },
    })

    return {
      success: true,
      message: form.confirmationMessage || 'Thank you for your submission!',
      redirectUrl: form.redirectUrl,
    }
  } catch (error) {
    console.error('[submitForm]', error)
    return { success: false, error: 'Failed to submit form' }
  }
}

export async function getFormSubmissions(formId: string) {
  try {
    const tenant = await requireTenant()
    const form = await prisma.customForm.findFirst({ where: { id: formId, tenantId: tenant.id } })
    if (!form) return { success: false, error: 'Form not found', data: [] }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: submissions }
  } catch (error) {
    console.error('[getFormSubmissions]', error)
    return { success: false, error: 'Failed to load submissions', data: [] }
  }
}
