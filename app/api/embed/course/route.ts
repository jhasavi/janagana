import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncFormSubmissionToContact } from '@/lib/crm-sync'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers || {}),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantSlug, courseId, email, firstName, lastName } = body
    const headerTenantSlug = request.headers.get('x-tenant-slug')

    if (headerTenantSlug && tenantSlug && headerTenantSlug !== tenantSlug) {
      return jsonWithCors({ error: 'Tenant slug mismatch' }, { status: 403 })
    }

    if (!tenantSlug || !email) {
      return jsonWithCors({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return jsonWithCors({ error: 'Organization not found' }, { status: 404 })
    }

    // Sync to CRM as a form submission
    await syncFormSubmissionToContact({
      tenantId: tenant.id,
      email,
      firstName,
      lastName,
      source: 'course_enrollment',
    })

    // TODO: If you have a courses table, you would also create an enrollment record here
    // For now, we're just capturing the lead in CRM

    console.log('[embed.course.enroll.success]', {
      route: '/api/embed/course',
      tenantId: tenant.id,
      tenantSlug,
      courseId: courseId ?? null,
      email,
    })

    return jsonWithCors({ success: true })
  } catch (error) {
    console.error('Course enrollment error:', error)
    return jsonWithCors({ error: 'Failed to enroll' }, { status: 500 })
  }
}
