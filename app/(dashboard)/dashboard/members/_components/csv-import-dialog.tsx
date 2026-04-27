'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Upload, Download, FileText, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { exportMembersCSV, importMembersCSV } from '@/lib/actions/members'

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

export function ExportCsvButton() {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const result = await exportMembersCSV()
      if (!result.success || !result.data) {
        toast.error('Export failed', { description: result.error ?? 'Unknown error' })
        return
      }
      // Trigger browser download
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Export complete', { description: 'CSV downloaded to your device.' })
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      <Download className="h-4 w-4" />
      {isPending ? 'Exporting…' : 'Export CSV'}
    </Button>
  )
}

// ─── CSV IMPORT ──────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f?.name.endsWith('.csv')) {
      setFile(f)
      setResult(null)
    } else {
      toast.error('Please drop a .csv file')
    }
  }

  function handleImport() {
    if (!file) return
    startTransition(async () => {
      const text = await file.text()
      const res = await importMembersCSV(text)
      if (!res.success || !res.data) {
        toast.error('Import failed', { description: res.error ?? 'Unknown error' })
        return
      }
      setResult(res.data)
      toast.success(`Imported ${res.data.imported} members`, {
        description: `${res.data.skipped} skipped${res.data.errors.length ? `, ${res.data.errors.length} errors` : ''}`,
      })
    })
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setFile(null)
      setResult(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with member data. Existing members (matched by email) will be
            skipped. Required columns: <code className="text-xs">firstName, lastName, email</code>.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">{file.name}</span>
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = '' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv files only</p>
            </>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-1">
            <p className="font-medium">Import complete</p>
            <p className="text-muted-foreground">✅ Imported: <strong>{result.imported}</strong></p>
            <p className="text-muted-foreground">⏭️ Skipped:  <strong>{result.skipped}</strong></p>
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-1 text-destructive font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {result.errors.length} row error(s)
                </p>
                <ul className="text-xs text-destructive/80 list-disc list-inside max-h-28 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Template download */}
        <p className="text-xs text-muted-foreground">
          Need a template?{' '}
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => {
              const template = 'firstName,lastName,email,phone,status,address,city,state,postalCode,country,notes\nJane,Doe,jane@example.com,555-1234,ACTIVE,123 Main St,Springfield,MA,01101,US,\n'
              const blob = new Blob([template], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = 'members-template.csv'; a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Download template
          </button>
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isPending}>
            {isPending ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
