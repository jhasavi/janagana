'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { previewMembersImportCsv, commitMembersImportCsv } from '@/lib/actions/organization-console'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ImportStrategy = 'skip_duplicates' | 'update_existing' | 'create_new_only' | 'merge_by_email'

export function ImportCenterPanel() {
  const [strategy, setStrategy] = useState<ImportStrategy>('skip_duplicates')
  const [csvContent, setCsvContent] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [preview, setPreview] = useState<{
    totalRows: number
    validRows: number
    invalidRows: number
    duplicates: number
    willCreate: number
    willUpdate: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const onFileChange = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvContent(String(reader.result ?? ''))
    }
    reader.readAsText(file)
  }

  const runPreview = () => {
    startTransition(async () => {
      const result = await previewMembersImportCsv({ csvContent, strategy })
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to preview import')
        return
      }
      setPreview(result.data)
      toast.success('Import preview ready')
    })
  }

  const runImport = () => {
    if (!preview) {
      toast.error('Preview before commit')
      return
    }

    startTransition(async () => {
      const result = await commitMembersImportCsv({
        csvContent,
        strategy,
        confirmationText: confirmationText || undefined,
      })

      if (!result.success) {
        const message = 'error' in result ? result.error : 'Import failed'
        toast.error(message)
        return
      }

      const created = result.data && 'created' in result.data ? result.data.created : 0
      const updated = result.data && 'updated' in result.data ? result.data.updated : 0
      toast.success(`Import complete (${created} created, ${updated} updated)`)
      setPreview(null)
      setConfirmationText('')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload CSV, map to existing member/contact structure, preview validation, and commit with duplicate strategy.
        </p>

        <div className="space-y-1.5">
          <Label>CSV file</Label>
          <Input type="file" accept=".csv,text/csv" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
        </div>

        <div className="space-y-1.5">
          <Label>Import strategy</Label>
          <Select value={strategy} onValueChange={(value) => setStrategy(value as ImportStrategy)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="skip_duplicates">Skip duplicates</SelectItem>
              <SelectItem value="update_existing">Update existing</SelectItem>
              <SelectItem value="create_new_only">Create new only</SelectItem>
              <SelectItem value="merge_by_email">Merge by email (phase-in)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>CSV content</Label>
          <Textarea
            value={csvContent}
            onChange={(event) => setCsvContent(event.target.value)}
            placeholder="Paste CSV here if you prefer manual input"
            className="min-h-[220px] font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={runPreview} disabled={isPending || !csvContent}>
            {isPending ? 'Working...' : 'Preview Import'}
          </Button>
          <Button type="button" onClick={runImport} disabled={isPending || !preview}>
            Commit Import
          </Button>
        </div>

        {preview && (
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p>Total rows: {preview.totalRows}</p>
            <p>Valid rows: {preview.validRows}</p>
            <p>Invalid rows: {preview.invalidRows}</p>
            <p>Duplicates detected: {preview.duplicates}</p>
            <p>Will create: {preview.willCreate}</p>
            <p>Will update: {preview.willUpdate}</p>
            {strategy === 'update_existing' && preview.duplicates > 0 && (
              <div className="space-y-1.5 pt-2">
                <Label>Type CONFIRM to update existing records</Label>
                <Input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
