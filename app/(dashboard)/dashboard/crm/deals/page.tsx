import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DealKanban } from '../_components/deal-kanban'

export default async function DealsPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const deals = await prisma.deal.findMany({
    where: { tenantId: tenant.id },
    include: {
      contact: true,
      company: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deals</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and opportunities
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/crm/deals/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Deal
          </Link>
        </Button>
      </div>

      <DealKanban deals={deals} />
    </div>
  )
}
