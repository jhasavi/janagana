import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CompanyForm } from '../../_components/company-form'

export default async function NewCompanyPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm/companies">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Company</h1>
        <p className="text-muted-foreground">
          Create a new company in your CRM
        </p>
      </div>

      <CompanyForm />
    </div>
  )
}
