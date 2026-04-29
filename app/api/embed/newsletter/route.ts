import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncNewsletterSubscriptionToContact } from '@/lib/crm-sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantSlug, email, firstName, lastName } = body

    if (!tenantSlug || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Sync to CRM
    await syncNewsletterSubscriptionToContact({
      tenantId: tenant.id,
      email,
      firstName,
      lastName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
