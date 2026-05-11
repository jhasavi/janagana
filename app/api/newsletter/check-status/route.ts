import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSimplifiedTenantProfile } from '@/lib/tenant-profile-simplified'

// Newsletter status check schema
const NewsletterStatusSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = NewsletterStatusSchema.parse(body)

    // Get tenant from simplified profile
    const profile = getSimplifiedTenantProfile()
    const tenant = await prisma.tenant.findFirst({
      where: { slug: profile.slug }
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Find contact by email
    const contact = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        emails: {
          has: data.email.toLowerCase().trim()
        }
      },
      select: {
        id: true,
        emails: true,
        firstName: true,
        lastName: true,
        tags: true,
        createdAt: true,
        source: true,
      },
    })

    if (!contact) {
      return NextResponse.json({
        isSubscribed: false,
        message: 'Email not found in CRM',
      })
    }

    // Check if contact has newsletter subscriber tag
    const isNewsletterSubscriber = contact.tags?.includes('newsletter-subscriber') || false

    return NextResponse.json({
      isSubscribed: isNewsletterSubscriber,
      contact: isNewsletterSubscriber ? {
        id: contact.id,
        email: contact.emails?.[0] || null,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
      } : null,
      subscribedAt: contact.createdAt,
      source: contact.source,
    })

  } catch (error) {
    console.error('[Newsletter Status Check]', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check subscription status',
      },
      { status: 500 }
    )
  }
}
