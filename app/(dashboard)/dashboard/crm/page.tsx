import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactTable } from './_components/contact-table'
import { HelpButton } from '@/components/dashboard/help-button'

export default async function CRMPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    include: {
      member: true,
      company: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">CRM Contacts</h1>
            <p className="text-muted-foreground">
              Track all contacts including members, donors, and external people
            </p>
          </div>
          <HelpButton
            title="Add & Manage Contacts"
            content="To add a contact, click the 'Add Contact' button. Contacts can be members, donors, or external people. All CRM data is automatically synced from events, donations, and volunteer signups."
            link="/dashboard/help/crm/add-manage-contacts"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/crm/contacts/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Link>
        </Button>
      </div>

      <ContactTable contacts={contacts} />
    </div>
  )
}
