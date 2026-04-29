import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskForm } from '../../../_components/task-form'

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const task = await prisma.task.findFirst({
    where: { id, tenantId: tenant.id },
  })

  if (!task) {
    notFound()
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
          <Link href={`/dashboard/crm/tasks/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Task</h1>
        <p className="text-muted-foreground">
          Update task information
        </p>
      </div>

      <TaskForm
        contacts={contacts}
        deals={deals}
        initialData={{
          contactId: task.contactId || '',
          dealId: task.dealId || '',
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
        }}
        taskId={id}
      />
    </div>
  )
}
