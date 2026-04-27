import { notFound } from 'next/navigation'
import { getPortalContext, getPortalOpportunities } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import { PortalVolunteersClient } from './_components/portal-volunteers-client'

export default async function PortalVolunteersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [ctx, oppsResult] = await Promise.all([
    getPortalContext(slug),
    getPortalOpportunities(slug),
  ])
  if (!ctx) notFound()

  const opportunities = oppsResult.data ?? []

  const signups = await prisma.volunteerSignup.findMany({
    where: { memberId: ctx.member.id },
    select: { opportunityId: true },
  })
  const signedUpIds = signups.map((s) => s.opportunityId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteer Opportunities</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Make a difference — sign up for open volunteer opportunities.
        </p>
      </div>
      <PortalVolunteersClient
        opportunities={opportunities}
        signedUpIds={signedUpIds}
        slug={slug}
      />
    </div>
  )
}
