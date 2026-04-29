import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DealForm } from '../../../_components/deal-form'

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const deal = await prisma.deal.findFirst({
    where: { id, tenantId: tenant.id },
  })

  if (!deal) {
    notFound()
  }

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: { firstName: 'asc' },
  })

  const companies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/crm/deals/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deal
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Deal</h1>
        <p className="text-muted-foreground">
          Update deal information
        </p>
      </div>

      <DealForm
        contacts={contacts}
        companies={companies}
        initialData={{
          contactId: deal.contactId,
          companyId: deal.companyId || '',
          title: deal.title,
          description: deal.description || '',
          valueCents: deal.valueCents,
          currency: deal.currency,
          stage: deal.stage,
          probability: deal.probability,
          expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.toISOString().split('T')[0] : '',
          source: deal.source || '',
        }}
        dealId={id}
      />
    </div>
  )
}
