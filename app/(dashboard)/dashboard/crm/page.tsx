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
            <h1 className="text-3xl font-bold">People</h1>
            <p className="text-muted-foreground">
              Track all people including members, donors, volunteers, and external contacts. People are the master record for all engagement.
            </p>
          </div>
          <HelpButton
            title="Add & Manage People"
            content="People are the master record for all engagement. Each person can have multiple roles: member, donor, volunteer, applicant, etc. All data from events, donations, and volunteering is linked to people."
            link="/dashboard/help/people/add-manage-people"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/crm/contacts/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Person
          </Link>
        </Button>
      </div>

      <ContactTable contacts={contacts} />
    </div>
  )
}
