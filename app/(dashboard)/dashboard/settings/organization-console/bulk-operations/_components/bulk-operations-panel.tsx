'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { previewContactBulkAction, commitContactBulkAction } from '@/lib/actions/organization-console'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type PreviewData = {
  operation: 'assign_tags' | 'archive' | 'restore'
  affectedCount: number
  highRisk: boolean
  largeScopeWarning: boolean
  blockedByScope: boolean
  warnings: string[]
  requiresTypedConfirmation: boolean
  sample: Array<{ id: string; firstName: string; lastName: string; email: string | null; tags: string[] }>
  tagDelta: string[]
}

export function BulkOperationsPanel() {
  const [operation, setOperation] = useState<'assign_tags' | 'archive' | 'restore'>('assign_tags')
  const [segment, setSegment] = useState<'all' | 'members' | 'donors' | 'volunteers' | 'attendees' | 'leads' | 'archived'>('all')
  const [search, setSearch] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isPending, startTransition] = useTransition()

  const tags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const runPreview = () => {
    startTransition(async () => {
      const result = await previewContactBulkAction({
        operation,
        segment,
        search: search || undefined,
        tags,
      })

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to preview')
        return
      }

      setPreview(result.data as PreviewData)
      toast.success('Preview ready')
    })
  }

  const runCommit = () => {
    if (!preview) {
      toast.error('Preview before committing')
      return
    }

    startTransition(async () => {
      const result = await commitContactBulkAction({
        operation,
        segment,
        search: search || undefined,
        tags,
        confirmationText: confirmationText || undefined,
        expectedCount: preview.affectedCount,
      })

      if (!result.success) {
        toast.error(result.error ?? 'Failed to run bulk action')
        return
      }

      toast.success(`Bulk operation complete (${result.data?.affectedCount ?? 0} records)`)
      setPreview(null)
      setConfirmationText('')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Contact Operations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Operation</Label>
            <Select value={operation} onValueChange={(value) => setOperation(value as typeof operation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assign_tags">Bulk assign tags</SelectItem>
                <SelectItem value="archive">Bulk archive</SelectItem>
                <SelectItem value="restore">Bulk restore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Segment</Label>
            <Select value={segment} onValueChange={(value) => setSegment(value as typeof segment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                <SelectItem value="members">Members</SelectItem>
                <SelectItem value="donors">Donors</SelectItem>
                <SelectItem value="volunteers">Volunteers</SelectItem>
                <SelectItem value="attendees">Attendees</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Search scope</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="optional search" />
          </div>
        </div>

        {operation === 'assign_tags' && (
          <div className="space-y-1.5">
            <Label>Tags to assign (comma-separated)</Label>
            <Input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="vip, newsletter, board" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={runPreview} disabled={isPending}>
            {isPending ? 'Working...' : 'Preview Impact'}
          </Button>
          <Button type="button" onClick={runCommit} disabled={isPending || !preview || Boolean(preview?.blockedByScope)}>
            Commit Bulk Action
          </Button>
        </div>

        {preview && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              <p>
                <strong>Affected records:</strong> {preview.affectedCount}
              </p>
              <p>
                <strong>High risk:</strong> {preview.highRisk ? 'Yes' : 'No'}
              </p>
              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                  {preview.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}
              {preview.tagDelta.length > 0 && (
                <p>
                  <strong>Tags being added:</strong> {preview.tagDelta.join(', ')}
                </p>
              )}
              {preview.requiresTypedConfirmation && (
                <div className="space-y-1.5">
                  <Label>Type CONFIRM to continue</Label>
                  <Input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} />
                </div>
              )}
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">Sample records</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {preview.sample.map((item) => (
                    <p key={item.id}>{item.firstName} {item.lastName} ({item.email ?? 'No email'})</p>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
