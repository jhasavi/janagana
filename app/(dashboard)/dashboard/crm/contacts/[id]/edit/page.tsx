import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactForm } from '../../../_components/contact-form'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: tenant.id },
  })

  if (!contact) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/crm/contacts/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contact
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Contact</h1>
        <p className="text-muted-foreground">
          Update contact information
        </p>
      </div>

      <ContactForm
        initialData={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? contact.emails?.[0] ?? '',
          phone: contact.phone || '',
          jobTitle: contact.jobTitle || '',
          linkedinUrl: contact.linkedinUrl || '',
          companyName: contact.companyName || '',
          source: contact.source || '',
          notes: contact.notes || '',
        }}
        contactId={id}
      />
    </div>
  )
}
