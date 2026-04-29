import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DealForm } from '../../../_components/deal-form'

export default async function NewDealPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
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
          <Link href="/dashboard/crm/deals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Deal</h1>
        <p className="text-muted-foreground">
          Create a new deal in your pipeline
        </p>
      </div>

      <DealForm contacts={contacts} companies={companies} />
    </div>
  )
}
