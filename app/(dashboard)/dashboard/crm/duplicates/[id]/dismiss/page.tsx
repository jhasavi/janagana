import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DismissForm } from './_components/dismiss-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DismissPage({ params }: Props) {
  const { id } = await params
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const suggestion = await prisma.duplicateSuggestion.findFirst({
    where: { id, tenantId: tenant.id, status: 'PENDING' },
    include: {
      contactA: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
      contactB: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
    },
  })

  if (!suggestion) notFound()

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/crm/duplicates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dismiss Suggestion</h1>
          <p className="text-muted-foreground text-sm">
            Mark these two contacts as not duplicates.
          </p>
        </div>
      </div>

      <DismissForm suggestion={suggestion} />
    </div>
  )
}
