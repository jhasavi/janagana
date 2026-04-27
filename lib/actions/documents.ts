'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { uploadFile, deleteFile } from '@/lib/upload'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getMemberDocuments(memberId: string) {
  try {
    const tenant = await requireTenant()
    const docs = await prisma.memberDocument.findMany({
      where: { tenantId: tenant.id, memberId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: docs }
  } catch (e) {
    console.error('[getMemberDocuments]', e)
    return { success: false, error: 'Failed to load documents', data: [] }
  }
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

const UploadSchema = z.object({
  memberId:     z.string().min(1),
  documentType: z.enum(['GENERAL', 'ID_PROOF', 'ADDRESS_PROOF', 'MEMBERSHIP_FORM', 'WAIVER', 'CERTIFICATE', 'PHOTO', 'OTHER']).default('GENERAL'),
  description:  z.string().optional(),
})

export async function uploadMemberDocument(formData: FormData) {
  try {
    const tenant = await requireTenant()
    const { userId } = await auth()

    const raw = {
      memberId:     formData.get('memberId'),
      documentType: formData.get('documentType'),
      description:  formData.get('description'),
    }
    const data = UploadSchema.parse(raw)

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type (allow common document and image types)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'File type not supported. Use PDF, images, or Word documents.' }
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File is too large. Maximum size is 10 MB.' }
    }

    // Verify member belongs to this tenant
    const member = await prisma.member.findFirst({
      where: { id: data.memberId, tenantId: tenant.id },
    })
    if (!member) return { success: false, error: 'Member not found' }

    // Upload to Cloudinary
    const folder = `janagana/${tenant.slug}/member-docs`
    const uploaded = await uploadFile(file, folder)

    const doc = await prisma.memberDocument.create({
      data: {
        tenantId:     tenant.id,
        memberId:     data.memberId,
        fileName:     file.name,
        fileUrl:      uploaded.secure_url,
        publicId:     uploaded.public_id,
        fileType:     file.type,
        fileSizeBytes: file.size,
        documentType: data.documentType as 'GENERAL',
        description:  data.description || null,
        uploadedBy:   userId ?? null,
      },
    })

    revalidatePath(`/dashboard/members/${data.memberId}`)
    return { success: true, data: doc }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[uploadMemberDocument]', e)
    return { success: false, error: 'Failed to upload document' }
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteMemberDocument(docId: string) {
  try {
    const tenant = await requireTenant()

    const doc = await prisma.memberDocument.findFirst({
      where: { id: docId, tenantId: tenant.id },
    })
    if (!doc) return { success: false, error: 'Document not found' }

    // Delete from Cloudinary
    try {
      await deleteFile(doc.publicId)
    } catch (e) {
      // Log but don't block — remove DB record regardless
      console.warn('[deleteMemberDocument] Cloudinary delete failed:', e)
    }

    await prisma.memberDocument.delete({ where: { id: docId } })

    revalidatePath(`/dashboard/members/${doc.memberId}`)
    return { success: true }
  } catch (e) {
    console.error('[deleteMemberDocument]', e)
    return { success: false, error: 'Failed to delete document' }
  }
}
