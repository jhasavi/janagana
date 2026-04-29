import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Calendar, AlertCircle, User, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function TaskDetailPage({
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
    include: {
      contact: true,
      deal: true,
    },
  })

  if (!task) {
    notFound()
  }

  const statusConfig: Record<string, { label: string; variant: string }> = {
    TODO: { label: 'To Do', variant: 'secondary' },
    IN_PROGRESS: { label: 'In Progress', variant: 'default' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  }

  const priorityConfig: Record<string, { label: string; variant: string }> = {
    LOW: { label: 'Low', variant: 'secondary' },
    MEDIUM: { label: 'Medium', variant: 'default' },
    HIGH: { label: 'High', variant: 'warning' },
    URGENT: { label: 'Urgent', variant: 'destructive' },
  }

  const status = statusConfig[task.status]
  const priority = priorityConfig[task.priority]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={status.variant as any}>{status.label}</Badge>
              <Badge variant={priority.variant as any}>{priority.label}</Badge>
              {isOverdue && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/crm/tasks/${task.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Due Date:</span>
                  <span className={`text-sm ${isOverdue ? 'text-destructive' : ''}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              )}
              {task.completed && task.completedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Completed:</span>
                  <span className="text-sm">{formatDate(task.completedAt)}</span>
                </div>
              )}
              {task.contact && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Contact:</span>
                  <Link
                    href={`/dashboard/crm/contacts/${task.contact.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {task.contact.firstName} {task.contact.lastName}
                  </Link>
                </div>
              )}
              {task.deal && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Deal:</span>
                  <Link
                    href={`/dashboard/crm/deals/${task.deal.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {task.deal.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty right column for future expansion */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Additional task details and related activities will be displayed here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
