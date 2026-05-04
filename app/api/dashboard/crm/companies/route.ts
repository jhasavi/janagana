import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const { name, industry, website, address, city, state, postalCode, country, description } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        tenantId: context.tenantId,
        name,
        industry,
        website,
        address,
        city,
        state,
        postalCode,
        country,
        description,
      },
    })

    logTenantRequest('dashboard.crm.companies.create.success', context, {
      companyId: company.id,
    })

    return NextResponse.json({ success: true, company })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
