import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/actions/audit'

// Newsletter subscription schema
const NewsletterSubscribeSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  source: z.string().default('newsletter-form'),
  tags: z.array(z.string()).default([]),
  marketingConsent: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = NewsletterSubscribeSchema.parse(body)

    // Get tenant - for public newsletter API, use the default tenant
    // In production, this should be determined by domain or subdomain
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check if contact already exists
    let contact = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        emails: {
          has: data.email.toLowerCase().trim()
        }
      },
    })

    if (contact) {
      // Update existing contact with newsletter info
      const updatedTags = Array.from(new Set([...(contact.tags || []), ...data.tags, 'newsletter-subscriber']))
      
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          firstName: data.firstName || contact.firstName,
          lastName: data.lastName || contact.lastName,
          phones: data.phone ? [data.phone] : contact.phones,
          tags: updatedTags,
          updatedAt: new Date(),
        },
      })

      // Log audit
      await logAudit({
        action: 'CONTACT_UPDATED',
        resourceId: contact.id,
        resourceType: 'CONTACT',
        details: {
          reason: 'Newsletter subscription - existing contact updated',
          email: data.email,
          source: data.source,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Newsletter subscription updated',
        contact: {
          id: contact.id,
          email: contact.emails?.[0] || null,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          lifecycleStage: contact.lifecycleStage,
        },
        isExisting: true,
      })
    }

    // Create new contact from newsletter subscription
    contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        emails: [data.email.toLowerCase().trim()],
        phones: data.phone ? [data.phone] : [],
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        lifecycleStage: 'PROSPECT',
        engagementScore: 0,
        tags: [...data.tags, 'newsletter-subscriber'],
        source: data.source,
      },
    })

    // Log audit
    await logAudit({
      action: 'CONTACT_CREATED',
      resourceId: contact.id,
      resourceType: 'CONTACT',
      details: {
        reason: 'Newsletter subscription - new contact created',
        email: data.email,
        source: data.source,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Newsletter subscription successful',
      contact: {
        id: contact.id,
        email: contact.emails?.[0] || null,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
        lifecycleStage: contact.lifecycleStage,
      },
      isExisting: false,
    })

  } catch (error) {
    console.error('[Newsletter Subscribe]', error)
    
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
        error: 'Failed to subscribe to newsletter',
      },
      { status: 500 }
    )
  }
}
