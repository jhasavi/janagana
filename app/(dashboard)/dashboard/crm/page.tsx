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
      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100">People: Your Master Contact Records</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              <strong>People</strong> are the canonical master records for all individuals in your system. Every person who engages with your organization (as a member, donor, volunteer, event attendee, etc.) has a single People record. 
              <strong>Memberships</strong>, <strong>Donations</strong>, <strong>Volunteering</strong>, and <strong>Event Registrations</strong> are all linked to People records.
            </p>
          </div>
        </div>
      </div>

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
