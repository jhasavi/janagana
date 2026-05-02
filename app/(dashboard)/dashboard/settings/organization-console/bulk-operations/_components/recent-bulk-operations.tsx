'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { restoreRecentBulkOperation } from '@/lib/actions/organization-console'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RecentOperation = {
  id: string
  resourceId: string
  resourceName: string | null
  createdAt: Date
  metadata: unknown
}

export function RecentBulkOperations({ operations }: { operations: RecentOperation[] }) {
  const [confirmationByJob, setConfirmationByJob] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const onRestore = (jobId: string) => {
    startTransition(async () => {
      const result = await restoreRecentBulkOperation({
        jobId,
        confirmationText: confirmationByJob[jobId],
      })

      if (!result.success) {
        toast.error(result.error ?? 'Restore failed')
        return
      }

      toast.success(`Recovery complete (${result.data?.affectedCount ?? 0} contacts)`)
      setConfirmationByJob((prev) => ({ ...prev, [jobId]: '' }))
    })
  }

  if (operations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restore Recent Bulk Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent bulk operations found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restore Recent Bulk Operation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {operations.map((operation) => (
          <div key={operation.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">{operation.resourceName ?? 'Bulk operation'}</p>
            <p className="text-xs text-muted-foreground">Job ID: {operation.resourceId}</p>
            <p className="text-xs text-muted-foreground">{new Date(operation.createdAt).toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type RESTORE"
                value={confirmationByJob[operation.resourceId] ?? ''}
                onChange={(event) =>
                  setConfirmationByJob((prev) => ({ ...prev, [operation.resourceId]: event.target.value }))
                }
                className="max-w-[220px]"
              />
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onRestore(operation.resourceId)}>
                Restore
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
