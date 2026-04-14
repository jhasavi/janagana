import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, tenantSlug, role } = body

    // This is a test-only endpoint for E2E testing
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Find or create tenant
    let tenant
    if (tenantSlug) {
      tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      if (!tenant) {
        const plan = await prisma.plan.findFirst({ where: { slug: 'STARTER' } })
        if (!plan) {
          return NextResponse.json({ error: 'Starter plan not found' }, { status: 500 })
        }
        tenant = await prisma.tenant.create({
          data: {
            name: `${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)} Organization`,
            slug: tenantSlug,
            subscription: {
              create: {
                planId: plan.id,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        })
      }
    }

    // Find or create member
    let member
    if (tenant) {
      member = await prisma.member.findFirst({
        where: { tenantId: tenant.id, email },
      })
      if (!member) {
        member = await prisma.member.create({
          data: {
            tenantId: tenant.id,
            email,
            firstName: firstName || 'Test',
            lastName: lastName || 'User',
            status: 'ACTIVE',
          },
        })
      }
    }

    // Return success - the test fixtures will need to handle Clerk sign-in manually
    // This is a limitation of testing with Clerk's authentication flow
    return NextResponse.json({
      success: true,
      email,
      tenantSlug: tenant?.slug,
      message: 'Test data created. Manual Clerk sign-in required.',
    })
  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json(
      { error: 'Test login failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
