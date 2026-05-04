import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params
    const body = await request.json()
    const { name, industry, website, address, city, state, postalCode, country, description } = body

    // Verify company belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
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

    logTenantRequest('dashboard.crm.companies.update.success', context, {
      companyId: id,
    })

    return NextResponse.json({ success: true, company: updatedCompany })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params

    // Verify company belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Delete company
    await prisma.company.delete({
      where: { id },
    })

    logTenantRequest('dashboard.crm.companies.delete.success', context, {
      companyId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
