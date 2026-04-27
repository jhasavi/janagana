'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { slugify } from '@/lib/utils'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const CustomFieldSchema = z.object({
  fieldName: z.string().min(1, 'Field name is required').max(80),
  fieldType: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'URL', 'PHONE']).default('TEXT'),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  helpText: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

export async function getCustomFields() {
  try {
    const tenant = await requireTenant()
    const fields = await prisma.memberCustomField.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return { success: true, data: fields }
  } catch (error) {
    console.error('[getCustomFields]', error)
    return { success: false, error: 'Failed to load custom fields', data: [] }
  }
}

export async function createCustomField(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = CustomFieldSchema.parse(input)

    // Generate a stable slugified key from the field name
    const baseKey = slugify(data.fieldName).replace(/-/g, '_')
    let fieldKey = baseKey
    let attempt = 0
    while (await prisma.memberCustomField.findUnique({ where: { tenantId_fieldKey: { tenantId: tenant.id, fieldKey } } })) {
      attempt++
      fieldKey = `${baseKey}_${attempt}`
    }

    const field = await prisma.memberCustomField.create({
      data: {
        tenantId: tenant.id,
        fieldName: data.fieldName,
        fieldKey,
        fieldType: data.fieldType,
        isRequired: data.isRequired,
        options: data.options,
        helpText: data.helpText,
        sortOrder: data.sortOrder,
      },
    })

    revalidatePath('/dashboard/settings/custom-fields')
    revalidatePath('/dashboard/members')
    return { success: true, data: field }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[createCustomField]', error)
    return { success: false, error: 'Failed to create custom field' }
  }
}

export async function updateCustomField(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = CustomFieldSchema.parse(input)

    const field = await prisma.memberCustomField.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!field) return { success: false, error: 'Field not found' }

    const updated = await prisma.memberCustomField.update({
      where: { id },
      data: {
        fieldName: data.fieldName,
        fieldType: data.fieldType,
        isRequired: data.isRequired,
        options: data.options,
        helpText: data.helpText,
        sortOrder: data.sortOrder,
      },
    })

    revalidatePath('/dashboard/settings/custom-fields')
    revalidatePath('/dashboard/members')
    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[updateCustomField]', error)
    return { success: false, error: 'Failed to update custom field' }
  }
}

export async function deleteCustomField(id: string) {
  try {
    const tenant = await requireTenant()
    const field = await prisma.memberCustomField.findFirst({ where: { id, tenantId: tenant.id } })
    if (!field) return { success: false, error: 'Field not found' }

    // Soft delete — preserve historical values
    await prisma.memberCustomField.update({ where: { id }, data: { isActive: false } })

    revalidatePath('/dashboard/settings/custom-fields')
    revalidatePath('/dashboard/members')
    return { success: true }
  } catch (error) {
    console.error('[deleteCustomField]', error)
    return { success: false, error: 'Failed to delete custom field' }
  }
}

export async function reorderCustomFields(orderedIds: string[]) {
  try {
    const tenant = await requireTenant()
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.memberCustomField.updateMany({
          where: { id, tenantId: tenant.id },
          data: { sortOrder: index },
        })
      )
    )
    revalidatePath('/dashboard/settings/custom-fields')
    return { success: true }
  } catch (error) {
    console.error('[reorderCustomFields]', error)
    return { success: false, error: 'Failed to reorder fields' }
  }
}

// ─── MEMBER CUSTOM FIELD VALUES ──────────────────────────────────────────────

export async function getMemberCustomFieldValues(memberId: string) {
  try {
    const tenant = await requireTenant()
    const [fields, values] = await Promise.all([
      prisma.memberCustomField.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.memberCustomFieldValue.findMany({
        where: { memberId, field: { tenantId: tenant.id } },
        include: { field: true },
      }),
    ])

    const valueMap = Object.fromEntries(values.map((v) => [v.fieldId, v.value]))
    return { success: true, data: { fields, valueMap } }
  } catch (error) {
    console.error('[getMemberCustomFieldValues]', error)
    return { success: false, error: 'Failed to load custom field values', data: { fields: [], valueMap: {} } }
  }
}

export async function upsertMemberCustomFieldValues(
  memberId: string,
  values: Record<string, string>
) {
  try {
    const tenant = await requireTenant()

    // Validate memberId belongs to tenant
    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId: tenant.id } })
    if (!member) return { success: false, error: 'Member not found' }

    const fields = await prisma.memberCustomField.findMany({
      where: { tenantId: tenant.id, isActive: true },
    })

    // Validate required fields
    for (const field of fields) {
      if (field.isRequired && !values[field.id]?.trim()) {
        return { success: false, error: `${field.fieldName} is required` }
      }
    }

    await prisma.$transaction(
      Object.entries(values).map(([fieldId, value]) =>
        prisma.memberCustomFieldValue.upsert({
          where: { fieldId_memberId: { fieldId, memberId } },
          create: { fieldId, memberId, value },
          update: { value },
        })
      )
    )

    revalidatePath(`/dashboard/members/${memberId}`)
    return { success: true }
  } catch (error) {
    console.error('[upsertMemberCustomFieldValues]', error)
    return { success: false, error: 'Failed to save custom field values' }
  }
}
