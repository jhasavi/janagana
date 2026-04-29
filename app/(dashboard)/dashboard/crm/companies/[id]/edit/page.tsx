import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CompanyForm } from '../../../_components/company-form'

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const company = await prisma.company.findFirst({
    where: { id, tenantId: tenant.id },
  })

  if (!company) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/crm/companies/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Company
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Company</h1>
        <p className="text-muted-foreground">
          Update company information
        </p>
      </div>

      <CompanyForm
        initialData={{
          name: company.name,
          industry: company.industry || '',
          website: company.website || '',
          address: company.address || '',
          city: company.city || '',
          state: company.state || '',
          postalCode: company.postalCode || '',
          country: company.country || 'US',
          description: company.description || '',
        }}
        companyId={id}
      />
    </div>
  )
}
