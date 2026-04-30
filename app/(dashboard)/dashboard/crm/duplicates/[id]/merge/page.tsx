import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MergeContactsForm } from './_components/merge-contacts-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MergePage({ params }: Props) {
  const { id } = await params
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const suggestion = await prisma.duplicateSuggestion.findFirst({
    where: { id, tenantId: tenant.id, status: 'PENDING' },
    include: {
      contactA: {
        include: {
          _count: { select: { donations: true, eventRegistrations: true, volunteerSignups: true } },
        },
      },
      contactB: {
        include: {
          _count: { select: { donations: true, eventRegistrations: true, volunteerSignups: true } },
        },
      },
    },
  })

  if (!suggestion) notFound()

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/crm/duplicates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Merge Contacts</h1>
          <p className="text-muted-foreground text-sm">
            Choose which record to keep. The other record&apos;s data will be merged into the survivor.
          </p>
        </div>
      </div>

      <MergeContactsForm suggestion={suggestion} />
    </div>
  )
}
