import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskForm } from '../../_components/task-form'

export default async function NewTaskPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: { firstName: 'asc' },
  })

  const deals = await prisma.deal.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Task</h1>
        <p className="text-muted-foreground">
          Create a new task
        </p>
      </div>

      <TaskForm contacts={contacts} deals={deals} />
    </div>
  )
}
