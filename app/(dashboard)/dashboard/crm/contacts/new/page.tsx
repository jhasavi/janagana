import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactForm } from '../../_components/contact-form'

export default async function NewContactPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Contact</h1>
        <p className="text-muted-foreground">
          Create a new contact in your CRM
        </p>
      </div>

      <ContactForm companies={companies} />
    </div>
  )
}
