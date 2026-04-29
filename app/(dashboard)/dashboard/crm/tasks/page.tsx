import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskTable } from '../_components/task-table'

export default async function TasksPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const tasks = await prisma.task.findMany({
    where: { tenantId: tenant.id },
    include: {
      contact: true,
      deal: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and to-dos
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/crm/tasks/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Task
          </Link>
        </Button>
      </div>

      <TaskTable tasks={tasks} />
    </div>
  )
}
