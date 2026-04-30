import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssignOfficerForm } from './_components/assign-officer-form'

export default async function NewTermPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const [offices, contacts] = await Promise.all([
    prisma.governanceOffice.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true },
    }),
    prisma.contact.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, emails: true, email: true },
      take: 500,
    }),
  ])

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/governance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assign Officer</h1>
          <p className="text-muted-foreground text-sm">
            Link a person to a governance office for a given term.
          </p>
        </div>
      </div>

      <AssignOfficerForm offices={offices} contacts={contacts} />
    </div>
  )
}
