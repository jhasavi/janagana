import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, GitMerge, Upload, Download, ShieldCheck } from 'lucide-react'
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
      _count: {
        select: {
          donations: true,
          volunteerSignups: true,
          eventRegistrations: true,
          deals: true,
          tasks: true,
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100">Contacts: Your master CRM records</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Every person starts as a <strong>Contact</strong>. Memberships, donations, volunteering,
              event registrations, deals, tasks, and communication history all attach to that same contact
              record. Create contacts once, then reuse them across modules.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">
              Add and manage people as contacts first, then link memberships and engagement activity.
            </p>
          </div>
          <HelpButton
            title="Add & Manage Contacts"
            content="Contacts are the primary CRM records. Members, donors, volunteers, attendees, and leads all live here and connect to activities across the platform."
            link="/dashboard/help/crm/add-manage-contacts"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/organization-console/import-center">
              <Upload className="h-4 w-4 mr-2" />
              Import Contacts
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/organization-console/import-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/organization-console/bulk-operations">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Bulk Actions
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/crm/duplicates">
              <GitMerge className="h-4 w-4 mr-2" />
              Duplicate Review
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/crm/contacts/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Link>
          </Button>
        </div>
      </div>

      <ContactTable contacts={contacts} />
    </div>
  )
}
