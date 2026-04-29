import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CompanyTable } from '../_components/company-table'

export default async function CompaniesPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            Manage companies and organizations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/crm/companies/new">
            <Building2 className="h-4 w-4 mr-2" />
            Add Company
          </Link>
        </Button>
      </div>

      <CompanyTable companies={companies} />
    </div>
  )
}
