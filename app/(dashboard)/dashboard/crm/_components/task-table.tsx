'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, Calendar, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Task, Contact, Deal } from '@prisma/client'

type TaskWithRelations = Task & {
  contact: Contact | null
  deal: Deal | null
}

interface TaskTableProps {
  tasks: TaskWithRelations[]
}

const statusConfig = {
  TODO: { label: 'To Do', variant: 'secondary' as const },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' as const },
  COMPLETED: { label: 'Completed', variant: 'success' as const },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const },
}

const priorityConfig = {
  LOW: { label: 'Low', variant: 'secondary' as const },
  MEDIUM: { label: 'Medium', variant: 'default' as const },
  HIGH: { label: 'High', variant: 'warning' as const },
  URGENT: { label: 'Urgent', variant: 'destructive' as const },
}

export function TaskTable({ tasks }: TaskTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const handleDelete = () => {
    if (!deleteId) return
    startDelete(async () => {
      try {
        const response = await fetch(`/api/dashboard/crm/tasks/${deleteId}`, {
          method: 'DELETE',
        })
        const result = await response.json()
        if (result.success) {
          toast.success('Task deleted')
          setDeleteId(null)
          window.location.reload()
        } else {
          toast.error(result.error || 'Failed to delete task')
        }
      } catch (error) {
        toast.error('Failed to delete task')
      }
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="font-semibold text-lg mb-1">No tasks yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Get started by adding your first task.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/crm/tasks/new">Add Task</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Related To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const status = statusConfig[task.status]
              const priority = priorityConfig[task.priority]
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed

              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/dashboard/crm/tasks/${task.id}`}
                        className="font-medium hover:underline text-sm"
                      >
                        {task.title}
                      </Link>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priority.variant} className="text-xs">
                      {priority.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.contact ? (
                      <Link
                        href={`/dashboard/crm/contacts/${task.contact.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {task.contact.firstName} {task.contact.lastName}
                      </Link>
                    ) : task.deal ? (
                      <Link
                        href={`/dashboard/crm/deals/${task.deal.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {task.deal.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isOverdue && <AlertCircle className="h-3 w-3 text-destructive" />}
                      <span className={`text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/crm/tasks/${task.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/crm/tasks/${task.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
