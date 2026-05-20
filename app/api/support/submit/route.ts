import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'

const SupportRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  context: z.string().trim().max(200).optional(),
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SupportRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    const { name, email, message, context } = parsed.data

    // Resolve tenantId from auth context (best-effort, not required)
    let tenantId: string | null = null
    try {
      const { orgId } = await auth()
      if (orgId) {
        const tenant = await getTenant()
        tenantId = tenant?.id ?? null
      }
    } catch {
      // auth context not available in unauthenticated portal flows
    }

    // Persist to database
    await prisma.supportRequest.create({
      data: {
        tenantId: tenantId ?? undefined,
        name: name ?? undefined,
        email: email ?? undefined,
        message,
        context: context ?? undefined,
        status: 'open',
      },
    })

    const supportTo = process.env.SUPPORT_EMAIL ?? process.env.EMAIL_FROM
    if (supportTo) {
      await sendEmail({
        to: supportTo,
        subject: `Janagana support request${context ? `: ${context}` : ''}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; color: #111827;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">New support request</h1>
  <p><strong>Name:</strong> ${escapeHtml(name || 'Not provided')}</p>
  <p><strong>Email:</strong> ${escapeHtml(email || 'Not provided')}</p>
  <p><strong>Context:</strong> ${escapeHtml(context || 'Not provided')}</p>
  <div style="margin-top: 20px;">
    <p style="font-weight: 700;">Message</p>
    <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">${escapeHtml(message)}</div>
  </div>
</body>
</html>`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/submit]', error)
    return NextResponse.json({ error: 'Failed to submit support request' }, { status: 500 })
  }
}
