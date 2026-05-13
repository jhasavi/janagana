import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return new NextResponse('Unauthorized', { status: 401 })

  const { id: eventId } = await params

  const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } })
  if (!tenant) return new NextResponse('Not found', { status: 404 })

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: { title: true },
  })
  if (!event) return new NextResponse('Not found', { status: 404 })

  const includeWaitlist = req.nextUrl.searchParams.get('includeWaitlist') === 'true'

  const registrations = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      ...(includeWaitlist ? {} : { status: { not: 'WAITLISTED' } }),
    },
    include: {
      member: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          tier: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  })

  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Membership Tier', 'Status', 'Registered At']
  const rows = registrations.map((r) => [
    r.member.firstName,
    r.member.lastName,
    r.member.email,
    r.member.phone ?? '',
    r.member.tier?.name ?? '',
    r.status,
    r.createdAt.toISOString(),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const normalizedTitle = event.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const filename = `${normalizedTitle || 'event'}_${includeWaitlist ? 'all_registrants' : 'attendees'}.csv`

  return new NextResponse(`\uFEFF${csvContent}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
